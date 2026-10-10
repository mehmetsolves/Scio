// ─── API Client ──────────────────────────────────────────────────────────────

// NOT: Uygulama Scio olarak yeniden adlandırıldı ama backend Worker hâlâ eski
// adresinde yayında (Cloudflare'de deploy edilmiş, bu repoda kaynak kodu yok).
// Worker yeniden deploy edilip yeni bir adres alana kadar bu URL değişmemeli;
// değiştirilirse arama/çeviri/özetleme tamamen çalışmaz hale gelir.
const API_BASE_URL = 'https://wordreads-worker.yildirimmehmed21.workers.dev'

// ─── Types ───────────────────────────────────────────────────────────────────

import type { SourceName, Engine, TranslationStyle } from '../store/SettingsContext'

export interface Article {
    id: string
    source: string
    title: string
    authors: string[]
    year: number
    journal: string
    abstract: string
    url: string
}

// ─── Search (with pagination) ────────────────────────────────────────────────

export async function searchArticles(
    query: string,
    sources: SourceName[],
    page: number = 1,
): Promise<Article[]> {
    try {
        const params = new URLSearchParams({
            q: query,
            sources: sources.join(','),
            page: String(page),
        })
        const res = await fetch(`${API_BASE_URL}/api/search?${params}`)
        if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error((body as any).error || `Arama başarısız (HTTP ${res.status})`)
        }
        const data = await res.json()
        return (data as any).articles ?? []
    } catch (err: any) {
        if (err.message?.includes('Network request failed')) {
            throw new Error('Sunucuya bağlanılamıyor. İnternet bağlantını ve API adresini kontrol et.')
        }
        throw err
    }
}

// ─── Translate ───────────────────────────────────────────────────────────────

export async function translateText(
    text: string,
    opts: { style: TranslationStyle; engine: Engine; apiKey?: string; sourceLang?: string; targetLang?: string },
): Promise<string> {
    try {
        const body: Record<string, string> = {
            text,
            sourceLang: opts.sourceLang || 'en',
            targetLang: opts.targetLang || 'tr',
            style: opts.style,
            engine: opts.engine,
        }
        if (opts.apiKey && opts.engine !== 'mymemory') {
            body.apiKey = opts.apiKey
        }
        const res = await fetch(`${API_BASE_URL}/api/translate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error((data as any).error || `Çeviri başarısız (HTTP ${res.status})`)
        }
        const data = await res.json()
        return (data as any).translated
    } catch (err: any) {
        if (err.message?.includes('Network request failed')) {
            throw new Error('Sunucuya bağlanılamıyor. İnternet bağlantını kontrol et.')
        }
        throw err
    }
}

// ─── Summarize ───────────────────────────────────────────────────────────────

export async function summarizeText(
    text: string,
    opts: { engine: Engine; apiKey?: string },
): Promise<string> {
    try {
        const body: Record<string, string> = {
            text,
            targetLang: 'tr',
            engine: opts.engine,
        }
        if (opts.apiKey) {
            body.apiKey = opts.apiKey
        }
        const res = await fetch(`${API_BASE_URL}/api/summarize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error((data as any).error || `Özetleme başarısız (HTTP ${res.status})`)
        }
        const data = await res.json()
        return (data as any).summary
    } catch (err: any) {
        if (err.message?.includes('Network request failed')) {
            throw new Error('Sunucuya bağlanılamıyor. İnternet bağlantını kontrol et.')
        }
        throw err
    }
}

// ─── Extract full article body from a URL ────────────────────────────────────

export interface ExtractedArticle {
    title: string
    description: string
    content: string
    imageUrl?: string
    author?: string
    publishedDate?: string
    contentLanguage?: 'tr' | 'en'
}

export async function extractArticle(
    url: string,
    source?: string,
): Promise<ExtractedArticle> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/extract`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, source }),
        })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error((data as any).error || `Metin çıkarılamadı (HTTP ${res.status})`)
        }
        const data = await res.json()
        return data as ExtractedArticle
    } catch (err: any) {
        if (err.message?.includes('Network request failed')) {
            throw new Error('Sunucuya bağlanılamıyor. İnternet bağlantını kontrol et.')
        }
        throw err
    }
}
