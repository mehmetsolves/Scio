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
    // Legacy accessors (backward compatible)
    savedArticles: Article[]
    savedHNItems: HNItem[]

    // New entry-based accessors
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

    // Filter by status
    getArticlesByStatus: (status: ReadingStatus) => SavedArticleEntry[]
    getHNByStatus: (status: ReadingStatus) => SavedHNEntry[]
    getEvrimByStatus: (status: ReadingStatus) => SavedEvrimEntry[]

    // Update translation cache
    updateTranslation: (id: string, titleTr: string, abstractTr: string) => void

    ready: boolean
}

const STORAGE_KEY = '@wordreads_saved_articles_v2'
const HN_STORAGE_KEY = '@wordreads_saved_hn_v2'
const EVRIM_STORAGE_KEY = '@wordreads_saved_evrim'
const LEGACY_STORAGE_KEY = '@wordreads_saved_articles'
const LEGACY_HN_STORAGE_KEY = '@wordreads_saved_hn'

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

    // ── Filter by status ──
    const getArticlesByStatus = (status: ReadingStatus) =>
        articleEntries.filter((e) => e.status === status)

    const getHNByStatus = (status: ReadingStatus) =>
        hnEntries.filter((e) => e.status === status)

    const getEvrimByStatus = (status: ReadingStatus) =>
        evrimEntries.filter((e) => e.status === status)

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

    // Legacy accessors for backward compatibility
    const savedArticles = articleEntries.map((e) => e.article)
    const savedHNItems = hnEntries.map((e) => e.item)

    return (
        <SavedArticlesContext.Provider value={{
            savedArticles, savedHNItems,
            savedArticleEntries: articleEntries,
            savedHNEntries: hnEntries,
            savedEvrimEntries: evrimEntries,
            isSaved, isHNSaved, isEvrimSaved,
            toggleSave, toggleHNSave, toggleEvrimSave,
            removeArticle, removeHNItem, removeEvrimArticle,
            setArticleStatus, setHNStatus, setEvrimStatus,
            getArticlesByStatus, getHNByStatus, getEvrimByStatus,
            updateTranslation,
            ready,
        }}>
            {children}
        </SavedArticlesContext.Provider>
    )
}
