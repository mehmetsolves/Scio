import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { extractArticle, translateText, type ExtractedArticle } from '../api/client'
import type { Engine, TranslationStyle } from './SettingsContext'
import { useSettings } from './SettingsContext'

// ─── Types ───────────────────────────────────────────────────────────────────

export type DownloadLang = 'tr' | 'en'

export interface DownloadedArticle {
    id: string
    source: string
    origLang: DownloadLang
    title: string
    titleTr: string
    description: string
    descriptionTr: string
    body: string
    bodyTr: string
    imageUrl?: string
    link: string
    savedAt: number
}

export interface DownloadMeta {
    id: string
    source: string
    title: string
    description: string
    link: string
    imageUrl?: string
}

interface DownloadsContextValue {
    downloaded: DownloadedArticle[]
    isDownloaded: (id: string) => boolean
    downloadArticle: (meta: DownloadMeta) => Promise<void>
    removeDownload: (id: string) => void
    ready: boolean
}

// One key per article (its index is a small list of ids). Avoids the Android
// per-entry AsyncStorage limit and rewrites only the changed entry.
const INDEX_KEY = '@wordreads_downloads_index'
const entryKey = (id: string) => `@wordreads_download_${id}`

const MAX_BODY_CHARS = 30_000

const TR_SOURCES = new Set(['bbc', 'ntv', 'sozcu', 'hurriyet', 'evrimagaci', 'evrimaci'])

const DownloadsContext = createContext<DownloadsContextValue | null>(null)

export function useDownloads(): DownloadsContextValue {
    const ctx = useContext(DownloadsContext)
    if (!ctx) throw new Error('useDownloads must be used within <DownloadsProvider>')
    return ctx
}

// Detect direction: prefer a Turkish-language source, else use extraction result.
function detectOrigLang(source: string, extracted?: ExtractedArticle): DownloadLang {
    if (extracted?.contentLanguage) return extracted.contentLanguage
    if (TR_SOURCES.has(source.toLowerCase())) return 'tr'
    return 'en'
}

// MyMemory caps request size; translate in chunks so long bodies translate fully.
function chunkText(text: string, size = 1000): string[] {
    const chunks: string[] = []
    for (let i = 0; i < text.length; i += size) {
        chunks.push(text.slice(i, i + size))
    }
    return chunks
}

export function DownloadsProvider({ children }: { children: ReactNode }) {
    const [downloaded, setDownloaded] = useState<DownloadedArticle[]>([])
    const [ready, setReady] = useState(false)
    const { engine, style, apiKey } = useSettings()

    // ── Load on mount ──
    useEffect(() => {
        ;(async () => {
            try {
                const raw = await AsyncStorage.getItem(INDEX_KEY)
                const ids: string[] = raw ? JSON.parse(raw) : []
                const entries = await Promise.all(
                    ids.map(async (id) => {
                        const rawEntry = await AsyncStorage.getItem(entryKey(id))
                        return rawEntry ? (JSON.parse(rawEntry) as DownloadedArticle) : null
                    }),
                )
                setDownloaded(entries.filter((e): e is DownloadedArticle => e !== null).sort((a, b) => b.savedAt - a.savedAt))
            } catch (e) {
                console.warn('Failed to load downloads:', e)
            } finally {
                setReady(true)
            }
        })()
    }, [])

    const persistEntry = (entry: DownloadedArticle) => {
        AsyncStorage.setItem(entryKey(entry.id), JSON.stringify(entry)).catch((e) =>
            console.warn('Failed to persist download:', e),
        )
    }

    const updateIndex = (entries: DownloadedArticle[]) => {
        AsyncStorage.setItem(INDEX_KEY, JSON.stringify(entries.map((e) => e.id))).catch((e) =>
            console.warn('Failed to persist download index:', e),
        )
    }

    const isDownloaded = (id: string) => downloaded.some((e) => e.id === id)

    const removeDownload = (id: string) => {
        setDownloaded((prev) => {
            const next = prev.filter((e) => e.id !== id)
            AsyncStorage.removeItem(entryKey(id)).catch((e) => console.warn('Failed to delete download:', e))
            updateIndex(next)
            return next
        })
    }

    const translateTo = async (
        text: string,
        opts: { style: TranslationStyle; engine: Engine; apiKey?: string; sourceLang: DownloadLang; targetLang: DownloadLang },
    ): Promise<string> => {
        // For short text send it whole; for long bodies chunk to stay under API limits.
        if (text.length <= 1500) {
            try {
                return await translateText(text, opts)
            } catch {
                return text
            }
        }
        const chunks = chunkText(text)
        const results = await Promise.allSettled(
            chunks.map((chunk) => translateText(chunk, opts)),
        )
        return results
            .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
            .map((r) => r.value)
            .join(' ')
            .trim()
    }

    const downloadArticle = async (meta: DownloadMeta) => {
        if (!meta.link) return
        const extracted = await extractArticle(meta.link, meta.source)

        const origLang = detectOrigLang(meta.source, extracted)
        const targetLang: DownloadLang = origLang === 'tr' ? 'en' : 'tr'

        const title = extracted?.title?.trim() || meta.title || ''
        const description = extracted?.description?.trim() || meta.description || ''
        const body = (extracted?.content || '').slice(0, MAX_BODY_CHARS)

        const baseOpts = { style, engine, apiKey: apiKey || undefined, sourceLang: origLang, targetLang }

        // Translate title + abstract/description + body in parallel-safe order (title/desc first).
        const [titleTr, descriptionTr, bodyTr] = await Promise.all([
            translateTo(title, baseOpts),
            translateTo(description, baseOpts),
            translateTo(body, baseOpts),
        ])

        const entry: DownloadedArticle = {
            id: meta.id,
            source: meta.source,
            origLang,
            title,
            titleTr: titleTr || title,
            description,
            descriptionTr: descriptionTr || description,
            body,
            bodyTr: bodyTr || body,
            imageUrl: extracted?.imageUrl || meta.imageUrl,
            link: meta.link,
            savedAt: Date.now(),
        }

        setDownloaded((prev) => {
            const next = [entry, ...prev.filter((e) => e.id !== entry.id)].sort((a, b) => b.savedAt - a.savedAt)
            persistEntry(entry)
            updateIndex(next)
            return next
        })
    }

    return (
        <DownloadsContext.Provider value={{ downloaded, isDownloaded, downloadArticle, removeDownload, ready }}>
            {children}
        </DownloadsContext.Provider>
    )
}
