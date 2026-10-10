// ─── Evrim Ağacı API Client ──────────────────────────────────────────────────
//
// Evrim Ağacı RSS feed'inden makale çeker ve parse eder.
// https://evrimagaci.org/rss.xml
//

export interface EvrimAgaciArticle {
    id: string
    title: string
    description: string
    link: string
    pubDate: string       // ISO date string
    category: string
    imageUrl?: string
}

const RSS_URL = 'https://evrimagaci.org/rss.xml'

// ── Simple XML tag extractor (no external dep) ──────────────────────────────

function extractTag(xml: string, tag: string): string {
    const open = `<${tag}>`
    const close = `</${tag}>`

    const startIdx = xml.indexOf(open)
    if (startIdx === -1) return ''

    const afterOpen = startIdx + open.length
    const endIdx = xml.indexOf(close, afterOpen)
    if (endIdx === -1) return ''

    let content = xml.substring(afterOpen, endIdx).trim()

    // Strip CDATA wrapper if present
    if (content.startsWith('<![CDATA[') && content.endsWith(']]>')) {
        content = content.slice(9, -3)
    }

    return content
}

function extractAttribute(xml: string, tag: string, attr: string): string {
    const regex = new RegExp(`<${tag}[^>]+${attr}="([^"]*)"`, 'i')
    const match = xml.match(regex)
    return match ? match[1] : ''
}

// ── Strip HTML tags ─────────────────────────────────────────────────────────

function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
        .trim()
}

// ── Parse RSS XML ───────────────────────────────────────────────────────────

function parseRSS(xml: string): EvrimAgaciArticle[] {
    const articles: EvrimAgaciArticle[] = []

    // Split by <item> tags
    const items = xml.split('<item>')
    // First element is the channel header, skip it
    for (let i = 1; i < items.length; i++) {
        const itemXml = items[i]
        const closeIdx = itemXml.indexOf('</item>')
        const content = closeIdx >= 0 ? itemXml.substring(0, closeIdx) : itemXml

        const title = stripHtml(extractTag(content, 'title'))
        const link = extractTag(content, 'link')
        const rawDesc = extractTag(content, 'description')
        const description = stripHtml(rawDesc).substring(0, 300)
        const pubDate = extractTag(content, 'pubDate')
        const category = extractTag(content, 'category') || 'Bilim'

        // Try to extract image from description or media tags
        let imageUrl = extractAttribute(content, 'media:content', 'url')
        if (!imageUrl) {
            imageUrl = extractAttribute(content, 'enclosure', 'url')
        }
        if (!imageUrl) {
            // Try to find img src in description
            const imgMatch = rawDesc.match(/<img[^>]+src="([^"]*)"/)
            if (imgMatch) imageUrl = imgMatch[1]
        }

        if (title && link) {
            articles.push({
                id: `ea-${link.replace(/[^a-zA-Z0-9]/g, '').slice(-20)}`,
                title,
                description,
                link,
                pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                category,
                imageUrl,
            })
        }
    }

    return articles
}

// ── Fetch all articles ──────────────────────────────────────────────────────

export async function fetchEvrimAgaciArticles(): Promise<EvrimAgaciArticle[]> {
    try {
        const res = await fetch(RSS_URL)
        if (!res.ok) {
            throw new Error(`Evrim Ağacı RSS alınamadı (HTTP ${res.status})`)
        }
        const xml = await res.text()
        return parseRSS(xml)
    } catch (err: any) {
        if (err.message?.includes('Network request failed')) {
            throw new Error('Evrim Ağacı\'na bağlanılamıyor. İnternet bağlantını kontrol et.')
        }
        throw err
    }
}

// ── Search/filter articles by keyword ───────────────────────────────────────

export async function searchEvrimAgaci(query: string): Promise<EvrimAgaciArticle[]> {
    const articles = await fetchEvrimAgaciArticles()
    const lowerQuery = query.toLowerCase()

    return articles.filter(
        (a) =>
            a.title.toLowerCase().includes(lowerQuery) ||
            a.description.toLowerCase().includes(lowerQuery) ||
            a.category.toLowerCase().includes(lowerQuery),
    )
}

// ── Format date for display ─────────────────────────────────────────────────

export function formatEvrimDate(isoDate: string): string {
    try {
        const d = new Date(isoDate)
        const now = new Date()
        const diffMs = now.getTime() - d.getTime()
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

        if (diffHours < 1) return 'Az önce'
        if (diffHours < 24) return `${diffHours} saat önce`
        const diffDays = Math.floor(diffHours / 24)
        if (diffDays < 7) return `${diffDays} gün önce`
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce`
        return `${Math.floor(diffDays / 30)} ay önce`
    } catch {
        return ''
    }
}
