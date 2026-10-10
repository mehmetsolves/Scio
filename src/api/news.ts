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

export type NewsSourceId = 'bbc' | 'ntv' | 'sozcu' | 'hurriyet'

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
        rssUrl: 'https://feeds.bbci.co.uk/turkce/rss.xml',
    },
    {
        id: 'ntv',
        label: 'NTV',
        color: '#1A237E',
        bg: '#E8EAF6',
        icon: '🔴',
        rssUrl: 'https://www.ntv.com.tr/gundem.rss',
    },
    {
        id: 'sozcu',
        label: 'Sözcü',
        color: '#D84315',
        bg: '#FBE9E7',
        icon: '📰',
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

// ── Parse RSS XML ───────────────────────────────────────────────────────────

function parseNewsRSS(xml: string, sourceId: NewsSourceId): NewsArticle[] {
    const articles: NewsArticle[] = []

    const items = xml.split('<item>')
    for (let i = 1; i < items.length; i++) {
        const itemXml = items[i]
        const closeIdx = itemXml.indexOf('</item>')
        const content = closeIdx >= 0 ? itemXml.substring(0, closeIdx) : itemXml

        const title = stripHtml(extractTag(content, 'title'))
        const link = extractTag(content, 'link')
        const rawDesc = extractTag(content, 'description')
        const description = stripHtml(rawDesc).substring(0, 300)
        const pubDate = extractTag(content, 'pubDate')
        const category = extractTag(content, 'category') || undefined

        // Try to extract image
        let imageUrl = extractAttribute(content, 'media:content', 'url')
        if (!imageUrl) {
            imageUrl = extractAttribute(content, 'media:thumbnail', 'url')
        }
        if (!imageUrl) {
            imageUrl = extractAttribute(content, 'enclosure', 'url')
        }
        if (!imageUrl) {
            const imgMatch = rawDesc.match(/<img[^>]+src="([^"]*)"/)
            if (imgMatch) imageUrl = imgMatch[1]
        }

        if (title && link) {
            articles.push({
                id: makeArticleId(sourceId, link),
                title,
                description,
                link,
                pubDate: toISODate(pubDate),
                source: sourceId,
                category,
                imageUrl,
            })
        }
    }

    return articles
}

// ── Fetch from a single source ──────────────────────────────────────────────

export async function fetchNewsFromSource(source: NewsSource): Promise<NewsArticle[]> {
    try {
        const res = await fetch(source.rssUrl)
        if (!res.ok) {
            console.warn(`${source.label} RSS failed: HTTP ${res.status}`)
            return []
        }
        const xml = await res.text()
        return parseNewsRSS(xml, source.id)
    } catch (err: any) {
        console.warn(`${source.label} RSS error:`, err.message)
        return []
    }
}

// ── Fetch from all sources ──────────────────────────────────────────────────

export async function fetchAllNews(sourceIds?: NewsSourceId[]): Promise<NewsArticle[]> {
    const sources = sourceIds
        ? NEWS_SOURCES.filter(s => sourceIds.includes(s.id))
        : NEWS_SOURCES

    const results = await Promise.allSettled(sources.map(fetchNewsFromSource))

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

export function getNewsSourceMeta(sourceId: NewsSourceId): NewsSource {
    return NEWS_SOURCES.find(s => s.id === sourceId) || NEWS_SOURCES[0]
}
