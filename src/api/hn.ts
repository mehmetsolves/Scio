// ─── Hacker News API Client ──────────────────────────────────────────────────
//
// Uses the official HN Firebase API: https://github.com/HackerNewsAPI/HN-API
//

const HN_BASE = 'https://hacker-news.firebaseio.com/v0'

export interface HNItem {
    id: number
    type: string        // 'story' | 'comment' | 'job' | 'poll'
    by: string          // author
    time: number        // Unix timestamp
    title: string
    url?: string        // external URL (may be absent for Ask HN)
    text?: string       // HTML body (for Ask HN, Show HN text posts)
    score: number
    descendants: number // comment count
    kids?: number[]
}

export type HNFeed = 'top' | 'new' | 'best'

// ── Fetch story IDs ──────────────────────────────────────────────────────────

const FEED_ENDPOINTS: Record<HNFeed, string> = {
    top: `${HN_BASE}/topstories.json`,
    new: `${HN_BASE}/newstories.json`,
    best: `${HN_BASE}/beststories.json`,
}

export async function fetchStoryIds(feed: HNFeed): Promise<number[]> {
    const res = await fetch(FEED_ENDPOINTS[feed])
    if (!res.ok) return []
    return (await res.json()) as number[]
}

// ── Fetch single item ────────────────────────────────────────────────────────

export async function fetchItem(id: number): Promise<HNItem | null> {
    try {
        const res = await fetch(`${HN_BASE}/item/${id}.json`)
        if (!res.ok) return null
        return (await res.json()) as HNItem
    } catch {
        return null
    }
}

// ── Fetch a batch of items (for list rendering) ──────────────────────────────

export async function fetchItems(ids: number[]): Promise<HNItem[]> {
    const results = await Promise.allSettled(ids.map(fetchItem))
    return results
        .filter((r): r is PromiseFulfilledResult<HNItem> => r.status === 'fulfilled' && r.value !== null)
        .map((r) => r.value)
}

// ── Helper: Extract domain from URL ──────────────────────────────────────────

export function extractDomain(url?: string): string {
    if (!url) return 'news.ycombinator.com'
    try {
        return new URL(url).hostname.replace(/^www\./, '')
    } catch {
        return 'news.ycombinator.com'
    }
}

// ── Helper: Time ago string ──────────────────────────────────────────────────

export function timeAgo(unixTime: number): string {
    const seconds = Math.floor(Date.now() / 1000) - unixTime
    if (seconds < 60) return 'az önce'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}dk önce`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}s önce`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}g önce`
    const months = Math.floor(days / 30)
    return `${months}ay önce`
}

// ── Helper: Filter by date range ─────────────────────────────────────────────

export type DateFilter = 'all' | 'today' | 'week' | 'month'

export function filterByDate(items: HNItem[], filter: DateFilter): HNItem[] {
    if (filter === 'all') return items
    const now = Math.floor(Date.now() / 1000)
    const cutoffs: Record<string, number> = {
        today: now - 86400,
        week: now - 604800,
        month: now - 2592000,
    }
    const cutoff = cutoffs[filter] ?? 0
    return items.filter((item) => item.time >= cutoff)
}
