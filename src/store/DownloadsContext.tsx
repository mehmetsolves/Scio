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
    // *Tr alanlarının gerçekte hangi dilde olduğu. (Alan adları geriye dönük
    // uyumluluk için "Tr" kaldı.) Eski kayıtlarda yok → origLang 'tr' ise
    // 'en', değilse 'tr' kabul edilir; bkz. translatedLangOf.
    translatedLang?: string
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
const INDEX_KEY = '@scio_downloads_index'
const entryKey = (id: string) => `@scio_download_${id}`
const LEGACY_INDEX_KEY = '@wordreads_downloads_index'
const legacyEntryKey = (id: string) => `@wordreads_download_${id}`

// WordReads → Scio: indirme kayıtlarını yeni anahtar şemasına taşır. Entry
// başına bir anahtar olduğu için önce index okunur, her kayıt kopyalanır,
// sonra eski anahtarlar silinir. Idempotent.
async function migrateDownloadedArticles(): Promise<void> {
    try {
        const rawIndex = await AsyncStorage.getItem(LEGACY_INDEX_KEY)
        if (!rawIndex) return
        const ids: string[] = JSON.parse(rawIndex)

        for (const id of ids) {
            const old = await AsyncStorage.getItem(legacyEntryKey(id))
            if (!old) continue
            const current = await AsyncStorage.getItem(entryKey(id))
            if (!current) await AsyncStorage.setItem(entryKey(id), old)
            await AsyncStorage.removeItem(legacyEntryKey(id))
        }

        const currentIndex = await AsyncStorage.getItem(INDEX_KEY)
        if (!currentIndex) await AsyncStorage.setItem(INDEX_KEY, rawIndex)
        await AsyncStorage.removeItem(LEGACY_INDEX_KEY)
    } catch (e) {
        console.warn('Failed to migrate downloaded articles:', e)
    }
}

const MAX_BODY_CHARS = 30_000

const TR_SOURCES = new Set(['bbc', 'ntv', 'sozcu', 'hurriyet', 'evrimagaci', 'evrimaci'])

const DownloadsContext = createContext<DownloadsContextValue | null>(null)

export function useDownloads(): DownloadsContextValue {
    const ctx = useContext(DownloadsContext)
    if (!ctx) throw new Error('useDownloads must be used within <DownloadsProvider>')
    return ctx
}

export function translatedLangOf(a: DownloadedArticle): string {
    return a.translatedLang ?? (a.origLang === 'tr' ? 'en' : 'tr')
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
    const { engine, style, apiKey, targetLanguage } = useSettings()

    // ── Load on mount ──
    useEffect(() => {
        ;(async () => {
            try {
                await migrateDownloadedArticles()
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
        opts: { style: TranslationStyle; engine: Engine; apiKey?: string; sourceLang: string; targetLang: string },
    ): Promise<string> => {
        // For short text send it whole; for long bodies chunk to stay under API limits.
        if (text.length <= 1500) {
            try {
                return await translateText(text, opts)
            } catch {
                return text
            }
        }
        // Sıralı: paralel 30 istek ücretsiz motorun hız sınırına takılıyordu ve
        // başarısız parçalar sessizce düşüp metinde boşluk bırakıyordu. Bir
        // parça başarısız olursa kalan kısım orijinal hâliyle eklenir.
        const chunks = chunkText(text)
        const out: string[] = []
        for (let i = 0; i < chunks.length; i++) {
            try {
                out.push(await translateText(chunks[i], opts))
            } catch {
                out.push(chunks.slice(i).join(''))
                break
            }
        }
        return out.join(' ').trim()
    }

    const downloadArticle = async (meta: DownloadMeta) => {
        if (!meta.link) return
        const extracted = await extractArticle(meta.link, meta.source)

        const origLang = detectOrigLang(meta.source, extracted)
        // Hedef: global targetLanguage. Makale zaten o dildeyse karşı dile
        // (tr ↔ en) çevrilir ki "çeviri" düğmesi yine işe yarasın.
        const targetLang =
            targetLanguage !== origLang ? targetLanguage : origLang === 'tr' ? 'en' : 'tr'

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
            translatedLang: targetLang,
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
