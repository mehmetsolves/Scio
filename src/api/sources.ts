// ─── Özel kaynaklar: feed bulma + içerik çekme ───────────────────────────────
//
// Kullanıcı bir RSS/Atom adresi de yapıştırabilir, sitenin ana sayfasını da
// ("webtekno.com"). İkinci durumda sayfa HTML'i taranır:
//   1. <link rel="alternate" type="application/rss+xml|atom+xml" href="..."> (RSS autodiscovery)
//   2. Bulunamazsa yaygın yollar denenir: /feed, /rss, /rss.xml ...
// Bulunan feed parse edilip makaleler yerel indekse (AsyncStorage) yazılır;
// bkz. CustomSourcesContext.

import { fetchWithTimeout, parseNewsRSS, type NewsArticle } from './news'
import { extractTag, stripHtml } from './rss'

export type SourceCategory = 'news' | 'science' | 'tech' | 'articles'

export const SOURCE_CATEGORIES: { id: SourceCategory; label: string; hint: string }[] = [
    { id: 'news', label: 'Haber', hint: 'Gündem sekmesinde görünür' },
    { id: 'science', label: 'Bilim', hint: 'Bilim sekmesinde görünür' },
    { id: 'tech', label: 'Teknoloji', hint: 'Teknoloji sekmesinde görünür' },
    { id: 'articles', label: 'Makale / Blog', hint: 'Makaleler aramasında görünür' },
]

export function categoryLabel(id: SourceCategory): string {
    return SOURCE_CATEGORIES.find((c) => c.id === id)?.label ?? 'Haber'
}

const COMMON_FEED_PATHS = ['/feed', '/rss', '/rss.xml', '/feed.xml', '/atom.xml', '/index.xml', '/feeds/posts/default']

// "webtekno.com" → "https://webtekno.com"; http → https.
export function normalizeInputUrl(input: string): string {
    let url = input.trim()
    if (!url) return ''
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = `https://${url}`
    return url.replace(/^http:\/\//i, 'https://')
}

function isFeed(body: string): boolean {
    const head = body.slice(0, 2000).toLowerCase()
    return (
        (head.includes('<rss') || head.includes('<feed') || head.includes('<rdf:rdf')) &&
        (body.includes('<item') || body.includes('<entry'))
    )
}

// NOT: React Native'in `URL` sınıfı eksik (bazı sürümlerde `origin`
// "not implemented" hatası atıyor). Bu yüzden elle çözülüyor.
export function originOf(url: string): string {
    const m = url.match(/^([a-z][a-z0-9+.-]*:\/\/[^/?#]+)/i)
    return m ? m[1] : url
}

function resolveUrl(href: string, base: string): string {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(href)) return href
    if (href.startsWith('//')) return 'https:' + href
    if (href.startsWith('/')) return originOf(base) + href
    // Göreli yol: tabanın son "/"una kadar olan kısmına ekle
    const clean = base.split(/[?#]/)[0]
    const dir = clean.endsWith('/') ? clean : clean.slice(0, clean.lastIndexOf('/') + 1)
    return dir + href
}

// HTML <head> içindeki RSS/Atom autodiscovery bağlantılarını döndürür.
function findAlternateFeeds(html: string, base: string): string[] {
    const out: string[] = []
    const linkRe = /<link\b[^>]*>/gi
    let m: RegExpExecArray | null
    while ((m = linkRe.exec(html))) {
        const tag = m[0]
        if (!/rel=["']?alternate/i.test(tag)) continue
        if (!/type=["']?application\/(rss|atom)\+xml/i.test(tag)) continue
        const href = tag.match(/href=["']([^"']+)["']/i)?.[1]
        if (href) out.push(resolveUrl(href.replace(/&amp;/g, '&'), base))
    }
    return out
}

function feedTitle(xml: string): string | undefined {
    // <channel><title> veya <feed><title>: ilk <title> genelde kanal başlığıdır
    const t = stripHtml(extractTag(xml, 'title'))
    return t || undefined
}

async function tryFeed(url: string): Promise<{ url: string; xml: string } | null> {
    try {
        const res = await fetchWithTimeout(url)
        if (!res.ok) return null
        const body = await res.text()
        return isFeed(body) ? { url, xml: body } : null
    } catch {
        return null
    }
}

export type DiscoverResult =
    | { ok: true; feedUrl: string; title?: string; siteUrl: string }
    | { ok: false; error: string }

export async function discoverFeed(input: string): Promise<DiscoverResult> {
    const url = normalizeInputUrl(input)
    if (!url) return { ok: false, error: 'Adres boş olamaz' }

    let body: string
    let finalUrl = url
    try {
        const res = await fetchWithTimeout(url)
        if (!res.ok) return { ok: false, error: `Site yanıt vermedi (HTTP ${res.status})` }
        body = await res.text()
        // Yönlendirme sonrası gerçek adres (göreli bağlantıları çözmek için)
        finalUrl = res.url || url
    } catch (err: any) {
        return { ok: false, error: err?.message || 'Adrese ulaşılamadı' }
    }

    // 1) Girilen adres zaten bir feed
    if (isFeed(body)) {
        return { ok: true, feedUrl: url, title: feedTitle(body), siteUrl: originOf(url) }
    }

    // 2) HTML sayfası: autodiscovery
    const alternates = findAlternateFeeds(body, finalUrl)
    for (const alt of alternates) {
        const hit = await tryFeed(alt)
        if (hit) return { ok: true, feedUrl: hit.url, title: feedTitle(hit.xml), siteUrl: finalUrl }
    }

    // 3) Yaygın feed yolları
    const origin = originOf(finalUrl)
    for (const path of COMMON_FEED_PATHS) {
        const hit = await tryFeed(origin + path)
        if (hit) return { ok: true, feedUrl: hit.url, title: feedTitle(hit.xml), siteUrl: origin }
    }

    return {
        ok: false,
        error: 'Bu sitede RSS/Atom kaynağı bulunamadı. Sitenin RSS adresini doğrudan yapıştırmayı dene.',
    }
}

// Bir özel kaynağın güncel makalelerini çeker. Hata fırlatır (çağıran taraf
// kaynak başına durum tutar).
export async function fetchSourceArticles(sourceId: string, feedUrl: string): Promise<NewsArticle[]> {
    const res = await fetchWithTimeout(feedUrl)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const xml = await res.text()
    return parseNewsRSS(xml, sourceId)
}
