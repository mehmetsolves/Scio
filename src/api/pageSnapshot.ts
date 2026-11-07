// ─── Tam sayfa anlık görüntüsü ("Farklı kaydet → Web sayfası, tamamı") ──────
//
// Bir sayfanın HTML'ini alır ve çevrimdışı açılabilen TEK bir HTML dosyasına
// dönüştürür:
//   • <link rel="stylesheet"> → içeriği indirilip <style> olarak gömülür
//     (CSS içindeki @import ve url() görselleri/fontları da gömülür)
//   • <img> (lazy-load data-src/srcset dahil) → data: URI olarak gömülür
//   • <script>, <iframe>, CSP meta etiketleri çıkarılır (çevrimdışı çalışmaz,
//     ağa çıkmaya çalışır; kaydedilen sayfa JS kapalı açılır)
//   • Bağlantılar mutlak adrese çevrilir (internete dönünce tıklanabilsin)
//
// Kaynak HTML iki yerden gelebilir:
//   1. WebView'da o an görünen sayfanın DOM'u (JS ile oluşturulmuş içerik ve
//      çevrilmiş sayfa dahil — tarayıcıdaki Ctrl+S'nin aynısı)
//   2. Doğrudan ağdan çekilen ham HTML (liste kartlarındaki indir butonu)
//
// Telefon tarafında fetch CORS'a takılmaz, bu yüzden başka alan adlarındaki
// CSS ve görseller de indirilebilir.

import { FETCH_USER_AGENT } from './news'
import { resolveUrl } from '../utils/url'

// Sınırlar: devasa sayfalar telefonu ve depolamayı zorlamasın
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024 // tek görsel
const MAX_FONT_BYTES = 400 * 1024 // tek font
const MAX_CSS_BYTES = 1.5 * 1024 * 1024 // tek stil dosyası
// Gömülen toplam. Aynı görsel sayfada N kez geçiyorsa N kez sayılır (her
// <img> kendi kopyasını taşır) — dosya boyutunu gerçekten sınırlayan bu.
const MAX_INLINE_TOTAL = 12 * 1024 * 1024
const RESOURCE_TIMEOUT_MS = 12000
const CONCURRENCY = 4

export interface SnapshotResult {
    html: string
    bytes: number
    images: number
    stylesheets: number
    skipped: number
}

interface Ctx {
    budget: number
    // İndirilen toplam (kullanılsın kullanılmasın). Bütçenin çok üstüne
    // çıkınca yeni indirme başlatılmaz — büyük sayfalarda süreyi kısaltır.
    fetched: number
    images: number
    stylesheets: number
    skipped: number
    cache: Map<string, Promise<string | null>>
}

// ── Ağ ──────────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, accept: string): Promise<Response> {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), RESOURCE_TIMEOUT_MS)
    try {
        return await fetch(url, {
            headers: { 'User-Agent': FETCH_USER_AGENT, Accept: accept },
            signal: ctrl.signal,
        })
    } finally {
        clearTimeout(timer)
    }
}

// İkili yanıtı data: URI'ye çevirir. RN'de Blob + FileReader.readAsDataURL
// (arrayBuffer RN'de her sürümde güvenilir değil); Node/test ortamında Buffer.
async function responseToDataUri(res: Response, mime: string): Promise<string> {
    if (typeof FileReader !== 'undefined') {
        const blob = await res.blob()
        const raw: string = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result))
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(blob)
        })
        // RN bazen boş/yanlış MIME yazar; sunucunun bildirdiğini kullan
        const comma = raw.indexOf(',')
        return `data:${mime};base64,${raw.slice(comma + 1)}`
    }
    const buf = await res.arrayBuffer()
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const B = (globalThis as any).Buffer
    return `data:${mime};base64,${B.from(buf).toString('base64')}`
}

function guessMime(url: string, header: string | null, kind: 'image' | 'font'): string {
    const h = (header || '').split(';')[0].trim()
    if (h && h !== 'application/octet-stream' && h !== 'binary/octet-stream') return h
    const ext = url.split(/[?#]/)[0].split('.').pop()?.toLowerCase()
    const map: Record<string, string> = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
        svg: 'image/svg+xml', avif: 'image/avif', ico: 'image/x-icon',
        woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf',
    }
    return (ext && map[ext]) || (kind === 'font' ? 'font/woff2' : 'image/jpeg')
}

// Bir kaynağı (görsel/font) data: URI olarak döndürür; sınırı aşan ya da
// indirilemeyen kaynak için null (orijinal adres yerinde kalır).
function inlineBinary(url: string, ctx: Ctx, kind: 'image' | 'font'): Promise<string | null> {
    if (url.startsWith('data:')) return Promise.resolve(url)
    if (!/^https?:/i.test(url)) return Promise.resolve(null)
    const key = `${kind}:${url}`
    const hit = ctx.cache.get(key)
    if (hit) return hit
    const p = (async () => {
        if (ctx.budget <= 0 || ctx.fetched > MAX_INLINE_TOTAL * 1.2) {
            ctx.skipped++
            return null
        }
        try {
            const res = await fetchWithTimeout(url, kind === 'image' ? 'image/*,*/*;q=0.8' : '*/*')
            if (!res.ok) throw new Error(String(res.status))
            const len = Number(res.headers.get('content-length') || 0)
            const max = kind === 'image' ? MAX_IMAGE_BYTES : MAX_FONT_BYTES
            if (len > max) throw new Error('too big')
            const dataUri = await responseToDataUri(res, guessMime(url, res.headers.get('content-type'), kind))
            const approxBytes = Math.floor((dataUri.length * 3) / 4)
            if (approxBytes > max) throw new Error('too big')
            ctx.fetched += dataUri.length
            return dataUri
        } catch {
            ctx.skipped++
            return null
        }
    })()
    ctx.cache.set(key, p)
    return p
}

// Gömülü kopyayı bütçeden düşer; bütçe yetmezse null (uzak adres kalır).
// Her kullanımda çağrılır.
function spend(dataUri: string | null, ctx: Ctx, kind: 'image' | 'font'): string | null {
    if (!dataUri) return null
    if (!dataUri.startsWith('data:')) return dataUri
    const bytes = dataUri.length
    if (bytes > ctx.budget) {
        ctx.skipped++
        return null
    }
    ctx.budget -= bytes
    if (kind === 'image') ctx.images++
    return dataUri
}

// Sınırlı eşzamanlılıkla iş kuyruğu
async function runPool<T>(items: T[], worker: (item: T) => Promise<void>) {
    let i = 0
    const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
        while (i < items.length) {
            const item = items[i++]
            await worker(item)
        }
    })
    await Promise.all(runners)
}

// ── HTML attribute yardımcıları ─────────────────────────────────────────────

function getAttr(tag: string, name: string): string | null {
    const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))
    if (!m) return null
    return (m[2] ?? m[3] ?? m[4] ?? '').replace(/&amp;/g, '&')
}

function removeAttr(tag: string, name: string): string {
    return tag.replace(new RegExp(`\\s${name}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, 'gi'), '')
}

function setAttr(tag: string, name: string, value: string): string {
    const safe = value.replace(/"/g, '&quot;')
    const cleaned = removeAttr(tag, name)
    return cleaned.replace(/^<([a-z0-9-]+)/i, (_m, t) => `<${t} ${name}="${safe}"`)
}

// srcset'ten ekrana en uygun (~1000px) adayı seçer
function pickFromSrcset(srcset: string): string | null {
    const cands = srcset
        .split(/,\s+(?=[^\s])/)
        .map((part) => {
            const [u, d] = part.trim().split(/\s+/)
            const n = d ? parseFloat(d) : 1
            const w = d?.endsWith('w') ? n : d?.endsWith('x') ? n * 500 : 500
            return { u, w }
        })
        .filter((c) => c.u)
    if (cands.length === 0) return null
    cands.sort((a, b) => Math.abs(a.w - 1000) - Math.abs(b.w - 1000))
    return cands[0].u
}

const PLACEHOLDER_RE = /^data:image\/(gif|svg\+xml|png);base64,.{0,200}$|^data:image\/svg\+xml,|blank\.gif|spacer\.gif|placeholder|lazy[-_]?load/i

// ── CSS ─────────────────────────────────────────────────────────────────────

// CSS içindeki url(...) kaynaklarını gömer; @import'ları (bir seviye) içeri alır.
async function processCss(css: string, cssUrl: string, ctx: Ctx, depth = 0): Promise<string> {
    // @import "x.css"; / @import url(x.css);
    if (depth < 2) {
        const imports = [...css.matchAll(/@import\s+(?:url\(\s*)?["']?([^"')\s;]+)["']?\s*\)?([^;]*);/gi)]
        for (const m of imports) {
            const abs = resolveUrl(m[1], cssUrl)
            const inner = await fetchCss(abs, ctx)
            let block = inner ? await processCss(inner, abs, ctx, depth + 1) : ''
            // @import url(x) [layer | layer(ad)] [supports(...)] [medya];
            // Eskiden kuyruğun tamamı medya sayılıyordu: "layer(ar5iv)" →
            // geçersiz "@media layer(ar5iv)" → tarayıcı bütün bloğu atıyordu
            // (arXiv sayfası stilsiz görünüyordu).
            let tail = (m[2] ?? '').trim()
            let layer: string | null = null
            const layerM = tail.match(/^layer(?:\(([^)]*)\))?/i)
            if (layerM) {
                layer = layerM[1]?.trim() ?? ''
                tail = tail.slice(layerM[0].length).trim()
            }
            let supports: string | null = null
            const supM = tail.match(/^supports\(((?:[^()]|\([^()]*\))*)\)/i)
            if (supM) {
                supports = supM[1].trim()
                tail = tail.slice(supM[0].length).trim()
            }
            if (tail) block = `@media ${tail}{${block}}`
            if (supports) block = `@supports (${supports}){${block}}`
            if (layer !== null) block = layer ? `@layer ${layer}{${block}}` : `@layer{${block}}`
            css = css.replace(m[0], () => block)
        }
    }

    const urls = new Set<string>()
    for (const m of css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi)) {
        if (!m[2].startsWith('data:') && !m[2].startsWith('#')) urls.add(m[2])
    }
    const replacements = new Map<string, string>()
    await runPool([...urls], async (raw) => {
        const abs = resolveUrl(raw, cssUrl)
        const isFont = /\.(woff2?|ttf|otf|eot)(\?|#|$)/i.test(abs)
        const data = spend(await inlineBinary(abs, ctx, isFont ? 'font' : 'image'), ctx, isFont ? 'font' : 'image')
        // Gömülemeyen kaynak mutlak adrese çevrilir (internet varsa yüklensin)
        replacements.set(raw, data ?? abs)
    })
    return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (whole, _q, raw) => {
        const rep = replacements.get(raw)
        return rep ? `url("${rep}")` : whole
    })
}

async function fetchCss(url: string, ctx: Ctx): Promise<string | null> {
    try {
        const res = await fetchWithTimeout(url, 'text/css,*/*;q=0.1')
        if (!res.ok) return null
        const text = await res.text()
        if (text.length > MAX_CSS_BYTES) {
            ctx.skipped++
            return null
        }
        ctx.stylesheets++
        return text
    } catch {
        ctx.skipped++
        return null
    }
}

// ── Ana fonksiyon ───────────────────────────────────────────────────────────

export async function fetchPageHtml(pageUrl: string): Promise<{ html: string; finalUrl: string }> {
    const res = await fetchWithTimeout(pageUrl, 'text/html,application/xhtml+xml,*/*;q=0.8')
    if (!res.ok) throw new Error(`Sayfa indirilemedi (HTTP ${res.status})`)
    const type = res.headers.get('content-type') || ''
    if (type && !/html|xml|text\/plain/i.test(type)) throw new Error('Bu adres bir web sayfası değil')
    return { html: await res.text(), finalUrl: res.url || pageUrl }
}

export async function snapshotPage(pageUrl: string, opts: { html?: string } = {}): Promise<SnapshotResult> {
    let html: string
    let baseUrl = pageUrl
    if (opts.html) {
        html = opts.html
    } else {
        const fetched = await fetchPageHtml(pageUrl)
        html = fetched.html
        baseUrl = fetched.finalUrl
    }

    // <base href> varsa göreli adresler ona göre çözülür
    const baseTag = html.match(/<base\b[^>]*>/i)?.[0]
    const baseHref = baseTag ? getAttr(baseTag, 'href') : null
    if (baseHref) baseUrl = resolveUrl(baseHref, baseUrl)

    const ctx: Ctx = { budget: MAX_INLINE_TOTAL, fetched: 0, images: 0, stylesheets: 0, skipped: 0, cache: new Map() }

    // 1) Çevrimdışında işe yaramayan / ağa çıkan öğeleri temizle
    html = html
        .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
        .replace(/<script\b[^>]*\/>/gi, '')
        .replace(/<noscript\b[\s\S]*?<\/noscript\s*>/gi, '')
        .replace(/<iframe\b[\s\S]*?<\/iframe\s*>/gi, '')
        .replace(/<iframe\b[^>]*\/?>/gi, '')
        .replace(/<base\b[^>]*>/gi, '')
        .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?(content-security-policy|refresh)["']?[^>]*>/gi, '')
        .replace(/<link\b[^>]*rel\s*=\s*["']?(preload|prefetch|modulepreload|preconnect|dns-prefetch|manifest|amphtml|alternate)[^>]*>/gi, '')
        // <picture><source srcset> → yalnızca <img> kalsın (gömülecek olan o)
        .replace(/<source\b[^>]*srcset[^>]*>/gi, '')

    // 2) Stil dosyaları → <style>
    const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).filter((t) => /rel\s*=\s*["']?[^"'>]*stylesheet/i.test(t))
    const linkReplacements = new Map<string, string>()
    await runPool(links, async (tag) => {
        const href = getAttr(tag, 'href')
        if (!href) return
        const abs = resolveUrl(href, baseUrl)
        const css = await fetchCss(abs, ctx)
        if (css === null) {
            linkReplacements.set(tag, setAttr(tag, 'href', abs))
            return
        }
        const processed = await processCss(css, abs, ctx)
        const media = getAttr(tag, 'media')
        linkReplacements.set(tag, `<style${media ? ` media="${media}"` : ''}>\n${processed.replace(/<\/style/gi, '<\\/style')}\n</style>`)
    })
    for (const [tag, rep] of linkReplacements) html = html.split(tag).join(rep)

    // 3) Satır içi <style> blokları ve style="" içindeki url()'ler
    const styleBlocks = [...html.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi)]
    for (const m of styleBlocks) {
        if (!/url\(/i.test(m[2])) continue
        const processed = await processCss(m[2], baseUrl, ctx)
        // Fonksiyonlu replace: CSS içindeki '$&' gibi diziler özel anlam taşımasın
        html = html.replace(m[0], () => `<style${m[1]}>${processed}</style>`)
    }

    // 4) Görseller
    const imgTags = [...new Set([...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]))]
    const imgReplacements = new Map<string, string>()
    await runPool(imgTags, async (tag) => {
        const lazy =
            getAttr(tag, 'data-src') || getAttr(tag, 'data-lazy-src') || getAttr(tag, 'data-original') || getAttr(tag, 'data-url')
        const srcset = getAttr(tag, 'srcset') || getAttr(tag, 'data-srcset') || getAttr(tag, 'data-lazy-srcset')
        let src = getAttr(tag, 'src')
        if (lazy) src = lazy
        else if ((!src || PLACEHOLDER_RE.test(src)) && srcset) src = pickFromSrcset(srcset)
        let out = tag
        for (const a of ['srcset', 'data-srcset', 'data-lazy-srcset', 'sizes', 'loading', 'data-src', 'data-lazy-src', 'data-original', 'decoding']) {
            out = removeAttr(out, a)
        }
        if (src) {
            const abs = resolveUrl(src, baseUrl)
            const data = await inlineBinary(abs, ctx, 'image')
            out = setAttr(out, 'src', data ?? abs)
        }
        imgReplacements.set(tag, out)
    })
    // Sayfadaki sırayla yerleştir: bütçe yukarıdan aşağı harcanır, böylece
    // makalenin üstündeki görseller önceliklidir. Bütçe biterse uzak adres.
    html = html.replace(/<img\b[^>]*>/gi, (tag) => {
        const rep = imgReplacements.get(tag)
        if (!rep) return tag
        const src = getAttr(rep, 'src') || ''
        if (!src.startsWith('data:')) return rep
        if (spend(src, ctx, 'image')) return rep
        const orig = getAttr(tag, 'data-src') || getAttr(tag, 'src') || ''
        return setAttr(rep, 'src', orig ? resolveUrl(orig, baseUrl) : '')
    })

    // 5) Bağlantıları mutlak yap (çevrimdışı okuyucu bunları tarayıcıda açar)
    html = html.replace(/<a\b[^>]*>/gi, (tag) => {
        const href = getAttr(tag, 'href')
        if (!href || href.startsWith('#') || /^(javascript|mailto|tel):/i.test(href)) return tag
        return setAttr(tag, 'href', resolveUrl(href, baseUrl))
    })

    // 6) Satır içi style="...url(...)" (arka plan görselleri)
    const inlineStyles = [...new Set([...html.matchAll(/\sstyle\s*=\s*"([^"]*url\([^"]*)"/gi)].map((m) => m[1]))]
    for (const st of inlineStyles) {
        const processed = await processCss(st.replace(/&quot;/g, '"'), baseUrl, ctx)
        html = html.split(`"${st}"`).join(`"${processed.replace(/"/g, "'")}"`)
    }

    // 7) Mobil görünüm ve kayıt bilgisi
    const head =
        '<meta charset="utf-8">' +
        (/<meta[^>]+name=["']?viewport/i.test(html) ? '' : '<meta name="viewport" content="width=device-width, initial-scale=1">') +
        `<!-- Scio çevrimdışı kopya: ${pageUrl.replace(/--/g, '')} — ${new Date().toISOString()} -->` +
        '<style>img,video{max-width:100%;height:auto}</style>'
    html = /<head\b[^>]*>/i.test(html) ? html.replace(/<head\b[^>]*>/i, (h) => h + head) : head + html
    if (!/^\s*<!doctype/i.test(html)) html = '<!DOCTYPE html>' + html

    return {
        html,
        bytes: html.length,
        images: ctx.images,
        stylesheets: ctx.stylesheets,
        skipped: ctx.skipped,
    }
}

// WebView'a enjekte edilir: o an görünen sayfanın DOM'unu (lazy görselleri
// gerçekten yüklenmiş adresleriyle) RN'e gönderir.
export const CAPTURE_DOM_SCRIPT = `(function(){try{
  document.querySelectorAll('img').forEach(function(img){
    var cur = img.currentSrc || img.src;
    if (cur && cur.indexOf('data:') !== 0) { img.setAttribute('src', cur); }
    img.removeAttribute('srcset'); img.removeAttribute('loading');
  });
  document.querySelectorAll('link[rel~="stylesheet"]').forEach(function(l){ if (l.href) l.setAttribute('href', l.href); });
  document.querySelectorAll('a[href]').forEach(function(a){ var h=a.getAttribute('href'); if (h && h.charAt(0)!=='#') a.setAttribute('href', a.href); });
  var dt = document.doctype ? '<!DOCTYPE ' + document.doctype.name + '>' : '<!DOCTYPE html>';
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'scio-snapshot', url: location.href, title: document.title, html: dt + document.documentElement.outerHTML }));
}catch(e){ window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'scio-snapshot-error', message: String(e && e.message || e) })); }})(); true;`
