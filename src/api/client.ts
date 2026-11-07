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

// MyMemory tek istekte en fazla ~500 bayt kabul ediyor. Metni cümle
// sınırlarından bölerek parçalar (Türkçe karakterler 2 bayt olduğu için
// güvenli pay bırakılır).
const MYMEMORY_CHUNK = 400

function splitForTranslation(text: string, max = MYMEMORY_CHUNK): string[] {
    const clean = text.replace(/\s+/g, ' ').trim()
    if (clean.length <= max) return clean ? [clean] : []
    const sentences = clean.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [clean]
    const chunks: string[] = []
    let cur = ''
    for (const sent of sentences) {
        if ((cur + sent).length <= max) {
            cur += sent
            continue
        }
        if (cur) chunks.push(cur.trim())
        if (sent.length <= max) {
            cur = sent
        } else {
            // Çok uzun tek cümle: kelime sınırından böl
            let rest = sent
            while (rest.length > max) {
                const cut = rest.lastIndexOf(' ', max)
                const at = cut > max / 2 ? cut : max
                chunks.push(rest.slice(0, at).trim())
                rest = rest.slice(at)
            }
            cur = rest
        }
    }
    if (cur.trim()) chunks.push(cur.trim())
    return chunks
}

async function myMemoryChunk(text: string, source: string, target: string): Promise<string> {
    const url =
        'https://api.mymemory.translated.net/get?q=' +
        encodeURIComponent(text) +
        '&langpair=' +
        encodeURIComponent(`${source}|${target}`)
    const res = await fetch(url)
    const data: any = await res.json().catch(() => null)
    if (!res.ok || !data) throw new Error(`Çeviri başarısız (HTTP ${res.status})`)
    const status = Number(data.responseStatus)
    const translated: string = data.responseData?.translatedText ?? ''
    if (data.quotaFinished || status === 429 || /MYMEMORY WARNING/i.test(translated)) {
        throw new Error(
            'Ücretsiz çeviri motorunun (MyMemory) günlük kotası doldu. Yarın tekrar dene ya da Ayarlar\'dan başka bir çeviri motoru seç.',
        )
    }
    if (status !== 200 || !translated) {
        throw new Error(data.responseDetails || 'Çeviri başarısız')
    }
    return translated
}

// MyMemory'yi doğrudan telefondan çağırır. Worker üzerinden çağrı
// ("MyMemory translation failed", HTTP 502) başarısız oluyordu: Worker'ın
// paylaşılan Cloudflare IP'leri MyMemory'nin IP başına kotasına takılıyor.
// Doğrudan çağrıda kota kullanıcının kendi IP'sine ait.
async function translateWithMyMemory(text: string, source: string, target: string): Promise<string> {
    const chunks = splitForTranslation(text)
    if (chunks.length === 0) return ''
    const out: string[] = []
    // Sıralı: paralel istekler MyMemory'nin hız sınırına takılıyor
    for (const c of chunks) out.push(await myMemoryChunk(c, source, target))
    return out.join(' ')
}

export async function translateText(
    text: string,
    opts: { style: TranslationStyle; engine: Engine; apiKey?: string; sourceLang?: string; targetLang?: string },
): Promise<string> {
    const sourceLang = opts.sourceLang || 'en'
    const targetLang = opts.targetLang || 'tr'
    if (!text.trim() || sourceLang === targetLang) return text

    if (opts.engine === 'mymemory') {
        try {
            return await translateWithMyMemory(text, sourceLang, targetLang)
        } catch (err: any) {
            if (err.message?.includes('Network request failed')) {
                throw new Error('İnternet bağlantısı yok. Bağlantını kontrol edip tekrar dene.')
            }
            throw err
        }
    }

    try {
        const body: Record<string, string> = {
            text,
            sourceLang,
            targetLang,
            style: opts.style,
            engine: opts.engine,
        }
        if (opts.apiKey) {
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
    opts: { engine: Engine; apiKey?: string; targetLang?: string },
): Promise<string> {
    try {
        const body: Record<string, string> = {
            text,
            targetLang: opts.targetLang || 'tr',
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
