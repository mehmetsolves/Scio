import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Article } from '../api/client'
import type { HNItem } from '../api/hn'
import type { EvrimAgaciArticle } from '../api/evrimagaci'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ReadingStatus = 'unread' | 'read_liked' | 'read_disliked'

export interface SavedArticleEntry {
    article: Article
    status: ReadingStatus
    savedAt: number
    titleTr?: string
    abstractTr?: string
}

export interface SavedHNEntry {
    item: HNItem
    status: ReadingStatus
    savedAt: number
}

export interface SavedEvrimEntry {
    article: EvrimAgaciArticle
    status: ReadingStatus
    savedAt: number
}

interface SavedArticlesContextValue {
    // Düz makale listesi (ProfileScreen istatistikleri için)
    savedArticles: Article[]

    // Entry tabanlı erişim
    savedArticleEntries: SavedArticleEntry[]
    savedHNEntries: SavedHNEntry[]
    savedEvrimEntries: SavedEvrimEntry[]

    // Check saved status
    isSaved: (id: string) => boolean
    isHNSaved: (id: number) => boolean
    isEvrimSaved: (id: string) => boolean

    // Toggle save
    toggleSave: (article: Article, titleTr?: string, abstractTr?: string) => void
    toggleHNSave: (item: HNItem) => void
    toggleEvrimSave: (article: EvrimAgaciArticle) => void

    // Remove
    removeArticle: (id: string) => void
    removeHNItem: (id: number) => void
    removeEvrimArticle: (id: string) => void

    // Reading status
    setArticleStatus: (id: string, status: ReadingStatus) => void
    setHNStatus: (id: number, status: ReadingStatus) => void
    setEvrimStatus: (id: string, status: ReadingStatus) => void

    // Update translation cache
    updateTranslation: (id: string, titleTr: string, abstractTr: string) => void

    ready: boolean
}

const STORAGE_KEY = '@scio_saved_articles_v2'
const HN_STORAGE_KEY = '@scio_saved_hn_v2'
const EVRIM_STORAGE_KEY = '@scio_saved_evrim'
// v1 (düz Article[]) → v2 (entry) geçişi için eski anahtarlar
const LEGACY_STORAGE_KEY = '@wordreads_saved_articles'
const LEGACY_HN_STORAGE_KEY = '@wordreads_saved_hn'
// WordReads → Scio yeniden adlandırması öncesi v2 anahtarları
const RENAME_STORAGE_KEY = '@wordreads_saved_articles_v2'
const RENAME_HN_STORAGE_KEY = '@wordreads_saved_hn_v2'
const RENAME_EVRIM_STORAGE_KEY = '@wordreads_saved_evrim'

// Yeniden adlandırma öncesi kayıtları yeni anahtarlara taşır. Eski v2 kaydı
// varsa ve yeni anahtar boşsa kopyalar; ardından artığı siler. Idempotent:
// ikinci açılışta eski anahtar bulunmaz, hiçbir şey yapmaz.
async function migrateRenamedKeys(): Promise<void> {
    const pairs: [string, string][] = [
        [RENAME_STORAGE_KEY, STORAGE_KEY],
        [RENAME_HN_STORAGE_KEY, HN_STORAGE_KEY],
        [RENAME_EVRIM_STORAGE_KEY, EVRIM_STORAGE_KEY],
    ]
    for (const [from, to] of pairs) {
        try {
            const old = await AsyncStorage.getItem(from)
            if (!old) continue
            const current = await AsyncStorage.getItem(to)
            if (!current) await AsyncStorage.setItem(to, old)
            await AsyncStorage.removeItem(from)
        } catch (e) {
            console.warn(`Failed to rename key ${from} → ${to}:`, e)
        }
    }
}

// ─── Context ─────────────────────────────────────────────────────────────────

const SavedArticlesContext = createContext<SavedArticlesContextValue | null>(null)

export function useSavedArticles(): SavedArticlesContextValue {
    const ctx = useContext(SavedArticlesContext)
    if (!ctx) throw new Error('useSavedArticles must be used within <SavedArticlesProvider>')
    return ctx
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function SavedArticlesProvider({ children }: { children: ReactNode }) {
    const [articleEntries, setArticleEntries] = useState<SavedArticleEntry[]>([])
    const [hnEntries, setHNEntries] = useState<SavedHNEntry[]>([])
    const [evrimEntries, setEvrimEntries] = useState<SavedEvrimEntry[]>([])
    const [ready, setReady] = useState(false)

    // ── Load on mount (with legacy migration) ──
    useEffect(() => {
        ;(async () => {
            try {
                await migrateRenamedKeys()
                const [rawV2, rawHNV2, rawEvrim, rawLegacy, rawLegacyHN] = await Promise.all([
                    AsyncStorage.getItem(STORAGE_KEY),
                    AsyncStorage.getItem(HN_STORAGE_KEY),
                    AsyncStorage.getItem(EVRIM_STORAGE_KEY),
                    AsyncStorage.getItem(LEGACY_STORAGE_KEY),
                    AsyncStorage.getItem(LEGACY_HN_STORAGE_KEY),
                ])

                // Load v2 entries
                if (rawV2) {
                    const parsed = JSON.parse(rawV2)
                    if (Array.isArray(parsed)) setArticleEntries(parsed)
                } else if (rawLegacy) {
                    // Migrate from legacy format
                    const parsed = JSON.parse(rawLegacy)
                    if (Array.isArray(parsed)) {
                        const migrated: SavedArticleEntry[] = parsed.map((a: Article) => ({
                            article: a,
                            status: 'unread' as ReadingStatus,
                            savedAt: Date.now(),
                        }))
                        setArticleEntries(migrated)
                        persistArticles(migrated)
                    }
                }

                if (rawHNV2) {
                    const parsed = JSON.parse(rawHNV2)
                    if (Array.isArray(parsed)) setHNEntries(parsed)
                } else if (rawLegacyHN) {
                    // Migrate from legacy format
                    const parsed = JSON.parse(rawLegacyHN)
                    if (Array.isArray(parsed)) {
                        const migrated: SavedHNEntry[] = parsed.map((item: HNItem) => ({
                            item,
                            status: 'unread' as ReadingStatus,
                            savedAt: Date.now(),
                        }))
                        setHNEntries(migrated)
                        persistHN(migrated)
                    }
                }

                if (rawEvrim) {
                    const parsed = JSON.parse(rawEvrim)
                    if (Array.isArray(parsed)) setEvrimEntries(parsed)
                }
            } catch (e) {
                console.warn('Failed to load saved items:', e)
            } finally {
                setReady(true)
            }
        })()
    }, [])

    // ── Persist helpers ──
    const persistArticles = (entries: SavedArticleEntry[]) => {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch((e) =>
            console.warn('Failed to persist saved articles:', e),
        )
    }

    const persistHN = (entries: SavedHNEntry[]) => {
        AsyncStorage.setItem(HN_STORAGE_KEY, JSON.stringify(entries)).catch((e) =>
            console.warn('Failed to persist saved HN items:', e),
        )
    }

    const persistEvrim = (entries: SavedEvrimEntry[]) => {
        AsyncStorage.setItem(EVRIM_STORAGE_KEY, JSON.stringify(entries)).catch((e) =>
            console.warn('Failed to persist saved Evrim articles:', e),
        )
    }

    // ── Check saved ──
    const isSaved = (id: string) => articleEntries.some((e) => e.article.id === id)
    const isHNSaved = (id: number) => hnEntries.some((e) => e.item.id === id)
    const isEvrimSaved = (id: string) => evrimEntries.some((e) => e.article.id === id)

    // ── Toggle save ──
    const toggleSave = (article: Article, titleTr?: string, abstractTr?: string) => {
        setArticleEntries((prev) => {
            const exists = prev.some((e) => e.article.id === article.id)
            const next = exists
                ? prev.filter((e) => e.article.id !== article.id)
                : [{ article, status: 'unread' as ReadingStatus, savedAt: Date.now(), titleTr, abstractTr }, ...prev]
            persistArticles(next)
            return next
        })
    }

    const toggleHNSave = (item: HNItem) => {
        setHNEntries((prev) => {
            const exists = prev.some((e) => e.item.id === item.id)
            const next = exists
                ? prev.filter((e) => e.item.id !== item.id)
                : [{ item, status: 'unread' as ReadingStatus, savedAt: Date.now() }, ...prev]
            persistHN(next)
            return next
        })
    }

    const toggleEvrimSave = (article: EvrimAgaciArticle) => {
        setEvrimEntries((prev) => {
            const exists = prev.some((e) => e.article.id === article.id)
            const next = exists
                ? prev.filter((e) => e.article.id !== article.id)
                : [{ article, status: 'unread' as ReadingStatus, savedAt: Date.now() }, ...prev]
            persistEvrim(next)
            return next
        })
    }

    // ── Remove ──
    const removeArticle = (id: string) => {
        setArticleEntries((prev) => {
            const next = prev.filter((e) => e.article.id !== id)
            persistArticles(next)
            return next
        })
    }

    const removeHNItem = (id: number) => {
        setHNEntries((prev) => {
            const next = prev.filter((e) => e.item.id !== id)
            persistHN(next)
            return next
        })
    }

    const removeEvrimArticle = (id: string) => {
        setEvrimEntries((prev) => {
            const next = prev.filter((e) => e.article.id !== id)
            persistEvrim(next)
            return next
        })
    }

    // ── Set reading status ──
    const setArticleStatus = (id: string, status: ReadingStatus) => {
        setArticleEntries((prev) => {
            const next = prev.map((e) => (e.article.id === id ? { ...e, status } : e))
            persistArticles(next)
            return next
        })
    }

    const setHNStatus = (id: number, status: ReadingStatus) => {
        setHNEntries((prev) => {
            const next = prev.map((e) => (e.item.id === id ? { ...e, status } : e))
            persistHN(next)
            return next
        })
    }

    const setEvrimStatus = (id: string, status: ReadingStatus) => {
        setEvrimEntries((prev) => {
            const next = prev.map((e) => (e.article.id === id ? { ...e, status } : e))
            persistEvrim(next)
            return next
        })
    }

    // ── Update translation cache ──
    const updateTranslation = (id: string, titleTr: string, abstractTr: string) => {
        setArticleEntries((prev) => {
            const next = prev.map((e) =>
                e.article.id === id ? { ...e, titleTr, abstractTr } : e,
            )
            persistArticles(next)
            return next
        })
    }

    const savedArticles = articleEntries.map((e) => e.article)

    return (
        <SavedArticlesContext.Provider value={{
            savedArticles,
            savedArticleEntries: articleEntries,
            savedHNEntries: hnEntries,
            savedEvrimEntries: evrimEntries,
            isSaved, isHNSaved, isEvrimSaved,
            toggleSave, toggleHNSave, toggleEvrimSave,
            removeArticle, removeHNItem, removeEvrimArticle,
            setArticleStatus, setHNStatus, setEvrimStatus,
            updateTranslation,
            ready,
        }}>
            {children}
        </SavedArticlesContext.Provider>
    )
}
