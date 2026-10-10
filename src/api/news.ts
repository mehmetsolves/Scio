// ─── Turkish News RSS Client ─────────────────────────────────────────────────
//
// Multiple Turkish news sources via RSS feeds:
// - BBC Türkçe
// - NTV
// - Sözcü
// - Hürriyet
//

export interface NewsArticle {
    id: string
    title: string
    description: string
    link: string
    pubDate: string       // ISO date string
    source: NewsSourceId
    category?: string
    imageUrl?: string
}

// Kullanıcının kendi RSS/Atom kaynağını ekleyebilmesi için `id` dinamik.
// `string & {}` ile dört built-in literal korunur (otomatik tamamlama ve tip
// güvenliği bozulmadan), aynı zamanda 'ozel-websitesi' gibi değerler de
// kabul edilir.
export type NewsSourceId = 'bbc' | 'ntv' | 'sozcu' | 'hurriyet' | (string & {})

export interface NewsSource {
    id: NewsSourceId
    label: string
    color: string
    bg: string
    icon: string
    rssUrl: string
}

export const NEWS_SOURCES: NewsSource[] = [
    {
        id: 'bbc',
        label: 'BBC Türkçe',
        color: '#BB1919',
        bg: '#FDE8E8',
        icon: '🔵',
        // Sözcü gibi bazı sunucular User-Agent olmadan isteği 403 ile reddediyor.
        rssUrl: 'https://feeds.bbci.co.uk/turkce/rss.xml',
    },
    {
        id: 'ntv',
        label: 'NTV',
        color: '#1A237E',
        bg: '#E8EAF6',
        icon: '🔴',
        // Atom formatında: <feed><entry>...</entry></feed>
        rssUrl: 'https://www.ntv.com.tr/turkiye.rss',
    },
    {
        id: 'sozcu',
        label: 'Sözcü',
        color: '#D84315',
        bg: '#FBE9E7',
        icon: '📰',
        // User-Agent olmadan 403 dönüyor
        rssUrl: 'https://www.sozcu.com.tr/feeds-rss-category-gundem',
    },
    {
        id: 'hurriyet',
        label: 'Hürriyet',
        color: '#0D47A1',
        bg: '#E3F2FD',
        icon: '📰',
        rssUrl: 'https://www.hurriyet.com.tr/rss/anasayfa',
    },
]

// Kullanıcıya sunulan toplu kaynak listesi (varsayılanlar +)
export const CUSTOM_SOURCE_COLOR = '#1A1A1A'

// İstemci tarafından yapılan tüm fetch isteklerine eklenecek tarayıcı
// User-Agent'ı. Çoğu haber sunucusu bu olmadan isteği engelliyor.
export const FETCH_USER_AGENT =
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'

export const FETCH_HEADERS = {
    'User-Agent': FETCH_USER_AGENT,
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
}

// ── XML yardımcıları (evrimagaci.ts ile ortak) ──────────────────────────────
import { extractTag, extractAttribute, stripHtml, makeStableId } from './rss'

// Some RSS feeds (e.g. Sözcü) emit pubDate values that `new Date()` can't parse
// (Turkish month names, extra commas, etc.). Convert safely without throwing.
function toISODate(pubDate: string): string {
    const fallback = new Date().toISOString()
    if (!pubDate) return fallback

    // Try a few common formats before giving up.
    const candidates = [pubDate]
    // "25 Ağustos 2026 Perşembe 09:00:00" -> "25 Ağustos 2026 09:00:00"
    const withoutWeekday = pubDate.replace(/\s+(Pazartesi|Salı|Çarşamba|Perşembe|Cuma|Cumartesi|Pazar)\s+/gi, ' ')
    if (withoutWeekday !== pubDate) candidates.push(withoutWeekday)

    for (const candidate of candidates) {
        const d = new Date(candidate)
        if (!isNaN(d.getTime())) return d.toISOString()
    }

    return fallback
}

// Her feed öğesi için kararlı, çakışmaya dirençli ID (ortak yardımcı).
function makeArticleId(sourceId: NewsSourceId, link: string): string {
    return makeStableId(`news-${sourceId}`, link)
}

// Bir <item> veya <entry> bloğunu makale modeline çevirir. Hem RSS hem Atom
// için tek gövde; yalnızca etiket adları farklı (pubDate/published,
// description/summary, enclosure/media:content).
function parseEntry(content: string, sourceId: NewsSourceId, isAtom: boolean): NewsArticle | null {
    // Atom'da başlantı <link rel="alternate" href="URL"> yapısındadır; RSS'te
    // metin içinde <link>URL</link> bulunur.
    const link = isAtom ? extractAttribute(content, 'link', 'href') : extractTag(content, 'link')
    const title = stripHtml(extractTag(content, 'title'))
    const rawDesc = isAtom
        ? extractTag(content, 'summary') || extractTag(content, 'content')
        : extractTag(content, 'description')
    const pubDate = extractTag(content, 'pubDate') || extractTag(content, 'published') || extractTag(content, 'updated')
    const category = stripHtml(extractTag(content, 'category')) || undefined

    // Try to extract image
    let imageUrl = extractAttribute(content, 'media:content', 'url')
    if (!imageUrl) imageUrl = extractAttribute(content, 'media:thumbnail', 'url')
    if (!imageUrl) imageUrl = extractAttribute(content, 'enclosure', 'url')
    if (!imageUrl) {
        const imgMatch = rawDesc.match(/<img[^>]+src="([^"]*)"/)
        if (imgMatch) imageUrl = imgMatch[1]
    }

    if (!title || !link) return null
    return {
        id: makeArticleId(sourceId, link),
        title,
        description: stripHtml(rawDesc).substring(0, 300),
        link,
        pubDate: toISODate(pubDate),
        source: sourceId,
        category,
        imageUrl,
    }
}

// ── Parse RSS / Atom feed ────────────────────────────────────────────────────

// Hem RSS (<rss><item>) hem Atom (<feed><entry>) desteklenir. NTV Atom kullanıyor
// ve RSS'teki gibi <item> etiketi aramayı göçürürdü.
function parseNewsRSS(xml: string, sourceId: NewsSourceId): NewsArticle[] {
    const articles: NewsArticle[] = []

    const [openTag, closeTag, isAtom] = xml.includes('<entry')
        ? ['<entry>', '</entry>', true]
        : ['<item>', '</item>', false]

    const blocks = xml.split(openTag)
    for (let i = 1; i < blocks.length; i++) {
        const closeIdx = blocks[i].indexOf(closeTag)
        const content = closeIdx >= 0 ? blocks[i].substring(0, closeIdx) : blocks[i]
        const entry = parseEntry(content, sourceId, isAtom)
        if (entry) articles.push(entry)
    }

    return articles
}

// Kullanıcının girdiği adresin gerçekten RSS/Atom beslediği olup olmadığını
// kaydetmeden önce doğrular. HTTP 200 değil de bozuk bir HTML sayfası
// döndüren adresleri reddetmek için içeriğe de bakılıyor.
export async function validateRssUrl(url: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const normalized = normalizeFeedUrl(url)
    try {
        const res = await fetch(normalized, { headers: FETCH_HEADERS })
        const body = await res.text()
        if (!res.ok) return { ok: false, error: `Sunucu yanıt vermedi (HTTP ${res.status})` }
        if (!body.includes('<item') && !body.includes('<entry')) {
            return { ok: false, error: 'Bu adres bir RSS veya Atom kaynağı değil' }
        }
        return { ok: true }
    } catch (err: any) {
        return { ok: false, error: err?.message || 'Adrese ulaşılamadı' }
    }
}

// Kullanıcı girdisini güvenli bir feed adresine çevirir: boşlukları atar,
// HTTP'yi HTTPS yapar.
export function normalizeFeedUrl(url: string): string {
    const trimmed = url.trim()
    return trimmed.replace(/^http:\/\//i, 'https://')
}

// ── Fetch from a single source ──────────────────────────────────────────────

export async function fetchNewsFromSource(
    source: NewsSource,
    opts: { signal?: AbortSignal } = {},
): Promise<NewsArticle[]> {
    try {
        // UA olmadan bazı sunucular 403 dönder (Sözcü, çoğu yerel site).
        // İçerik türü RSS veya Atom olarak doğrulanmadan işlem dener.
        const res = await fetch(source.rssUrl, { headers: FETCH_HEADERS, signal: opts.signal })
        if (!res.ok) {
            console.warn(`${source.label} RSS failed: HTTP ${res.status}`)
            return []
        }
        const xml = await res.text()
        return parseNewsRSS(xml, source.id)
    } catch (err: any) {
        if (err?.name === 'AbortError') throw err
        console.warn(`${source.label} RSS error:`, err.message)
        return []
    }
}

// ── Fetch from all sources ──────────────────────────────────────────────────

export async function fetchAllNews(
    sourceIds?: NewsSourceId[],
    opts: { sources?: NewsSource[]; signal?: AbortSignal } = {},
): Promise<NewsArticle[]> {
    const base = opts.sources ?? NEWS_SOURCES
    const sources = sourceIds ? base.filter(s => sourceIds.includes(s.id)) : base

    const results = await Promise.allSettled(
        sources.map(s => fetchNewsFromSource(s, { signal: opts.signal })),
    )

    const allArticles: NewsArticle[] = []
    for (const result of results) {
        if (result.status === 'fulfilled') {
            allArticles.push(...result.value)
        }
    }

    // Sort by date (newest first)
    allArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

    return allArticles
}

// ── Search/filter news by keyword ───────────────────────────────────────────

export function filterNews(articles: NewsArticle[], query: string): NewsArticle[] {
    const lowerQuery = query.toLowerCase()
    return articles.filter(
        (a) =>
            a.title.toLowerCase().includes(lowerQuery) ||
            a.description.toLowerCase().includes(lowerQuery) ||
            (a.category && a.category.toLowerCase().includes(lowerQuery)),
    )
}

// ── Format date for display ─────────────────────────────────────────────────

export function formatNewsDate(isoDate: string): string {
    try {
        const d = new Date(isoDate)
        const now = new Date()
        const diffMs = now.getTime() - d.getTime()
        const diffMin = Math.floor(diffMs / (1000 * 60))

        if (diffMin < 1) return 'Az önce'
        if (diffMin < 60) return `${diffMin} dk önce`
        const diffHours = Math.floor(diffMin / 60)
        if (diffHours < 24) return `${diffHours} saat önce`
        const diffDays = Math.floor(diffHours / 24)
        if (diffDays < 7) return `${diffDays} gün önce`
        // Show actual date
        return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
    } catch {
        return ''
    }
}

// ── Get source meta by id ───────────────────────────────────────────────────

// NOT: Bilinmeyen bir kaynak kimliği için artık sessizce BBC'ye düşmüyor.
// Özel kaynak eklendiğinde kullanıcı, eklediği siteye ait bilinmeyen bir
// kimlik için yanlışlıkla "BBC Türkçe" rozeti görmesin diye `undefined`
// döndürülüyor; çağıran taraf `FALLBACK_SOURCE_META` ile nötr bir görünüm
// sağlamalı.
export const FALLBACK_SOURCE_META = {
    color: '#6B6560',
    bg: '#F5F0EA',
}

export function getNewsSourceMeta(sourceId: NewsSourceId, sources?: NewsSource[]): NewsSource | undefined {
    const pool = sources ?? NEWS_SOURCES
    return pool.find(s => s.id === sourceId)
}
