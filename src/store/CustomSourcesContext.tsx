import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
    type ReactNode,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { CUSTOM_SOURCE_COLOR, type NewsArticle, type NewsSource } from '../api/news'
import { discoverFeed, fetchSourceArticles, type SourceCategory } from '../api/sources'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CustomSourceEntry {
    id: string
    label: string
    rssUrl: string
    // Eski kayıtlarda yok → 'news' kabul edilir (önceden hepsi Gündem'e gidiyordu)
    category?: SourceCategory
    siteUrl?: string
    addedAt?: number
}

export interface CustomSource extends NewsSource {
    category: SourceCategory
    siteUrl?: string
}

// Yerel "veri tabanı": kaynak başına son çekilen makaleler. AsyncStorage'da
// tutulur; arama indeksi buradan beslenir, böylece özel kaynaklarda arama
// ağ beklemeden ve çevrimdışıyken de çalışır.
interface SourceIndexEntry {
    articles: NewsArticle[]
    syncedAt: number
    error?: string
}

type SourceIndex = Record<string, SourceIndexEntry>

export type AddSourceResult = { ok: true; source: CustomSource; count: number } | { ok: false; error: string }

interface CustomSourcesContextValue {
    customSources: CustomSource[]
    // Kategoriye göre süzülmüş kaynaklar (ör. Bilim sekmesi için 'science')
    sourcesByCategory: (category: SourceCategory) => CustomSource[]
    // Tüm özel kaynakların makaleleri, yeniden eskiye
    allArticles: NewsArticle[]
    articlesByCategory: (category: SourceCategory) => NewsArticle[]
    sourceIndex: SourceIndex
    addSource: (label: string, url: string, category: SourceCategory) => Promise<AddSourceResult>
    removeSource: (id: string) => void
    // Verilen (ya da tüm) kaynakları yeniden çeker ve indekse yazar
    syncSources: (ids?: string[]) => Promise<void>
    syncing: boolean
    ready: boolean
}

const STORAGE_KEY = '@scio_custom_news_sources'
const LEGACY_STORAGE_KEY = '@wordreads_custom_news_sources'
const INDEX_STORAGE_KEY = '@scio_custom_source_articles'

// Kaynak başına saklanacak en fazla makale (AsyncStorage boyutunu sınırlar)
const MAX_ARTICLES_PER_SOURCE = 100
// Uygulama açıldığında bundan eski indeksler arka planda tazelenir
const AUTO_SYNC_AFTER_MS = 15 * 60 * 1000

const CustomSourcesContext = createContext<CustomSourcesContextValue | null>(null)

export function useCustomSources(): CustomSourcesContextValue {
    const ctx = useContext(CustomSourcesContext)
    if (!ctx) throw new Error('useCustomSources must be used within <CustomSourcesProvider>')
    return ctx
}

// Kullanıcının girdiği adresten kararlı bir kimlik üretir (aynı adres iki kez
// eklenirse aynı id'yi alır, böylece çakışma yerine tek bir kaynak olur).
function makeId(url: string): string {
    let hash = 5381
    for (let i = 0; i < url.length; i++) {
        hash = ((hash << 5) + hash + url.charCodeAt(i)) >>> 0
    }
    return `custom-${hash.toString(36)}`
}

function toCustomSource(entry: CustomSourceEntry): CustomSource {
    return {
        id: entry.id,
        label: entry.label,
        rssUrl: entry.rssUrl,
        // Özel kaynaklara sabit nötr renk veriliyor: herkese ayrı renk atmak
        // birkaç kaynaktan sonra kaynak kimliğini okunamaz hâle getiriyor.
        color: CUSTOM_SOURCE_COLOR,
        bg: 'transparent',
        icon: '📡',
        category: entry.category ?? 'news',
        siteUrl: entry.siteUrl,
    }
}

function byDateDesc(a: NewsArticle, b: NewsArticle) {
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function CustomSourcesProvider({ children }: { children: ReactNode }) {
    const [entries, setEntries] = useState<CustomSourceEntry[]>([])
    const [index, setIndex] = useState<SourceIndex>({})
    const [ready, setReady] = useState(false)
    const [syncingCount, setSyncingCount] = useState(0)

    // Callback'lerin güncel listeye erişmesi için (stale closure olmadan)
    const entriesRef = useRef(entries)
    entriesRef.current = entries
    const indexRef = useRef(index)
    indexRef.current = index

    // ── Load on mount (with legacy migration) ──
    useEffect(() => {
        ;(async () => {
            try {
                const [raw, rawIndex] = await Promise.all([
                    AsyncStorage.getItem(STORAGE_KEY),
                    AsyncStorage.getItem(INDEX_STORAGE_KEY),
                ])
                if (raw) {
                    const parsed = JSON.parse(raw)
                    if (Array.isArray(parsed)) setEntries(parsed)
                } else {
                    // WordReads → Scio taşıması (yoksa sessizce geçilir)
                    const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY)
                    if (legacy) {
                        const parsed = JSON.parse(legacy)
                        if (Array.isArray(parsed)) {
                            setEntries(parsed)
                            await AsyncStorage.setItem(STORAGE_KEY, legacy)
                        }
                    }
                }
                if (rawIndex) {
                    const parsedIndex = JSON.parse(rawIndex)
                    if (parsedIndex && typeof parsedIndex === 'object') setIndex(parsedIndex)
                }
            } catch (e) {
                console.warn('Failed to load custom sources:', e)
            } finally {
                setReady(true)
            }
        })()
    }, [])

    const persistEntries = (next: CustomSourceEntry[]) => {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((e) =>
            console.warn('Failed to persist custom sources:', e),
        )
    }

    const persistIndex = (next: SourceIndex) => {
        AsyncStorage.setItem(INDEX_STORAGE_KEY, JSON.stringify(next)).catch((e) =>
            console.warn('Failed to persist source index:', e),
        )
    }

    const writeIndex = useCallback((updates: SourceIndex, removeIds: string[] = []) => {
        setIndex((prev) => {
            const next: SourceIndex = { ...prev, ...updates }
            for (const id of removeIds) delete next[id]
            persistIndex(next)
            return next
        })
    }, [])

    const syncOne = useCallback(async (entry: CustomSourceEntry): Promise<SourceIndexEntry> => {
        try {
            const articles = (await fetchSourceArticles(entry.id, entry.rssUrl))
                .sort(byDateDesc)
                .slice(0, MAX_ARTICLES_PER_SOURCE)
            return { articles, syncedAt: Date.now() }
        } catch (err: any) {
            // Ağ hatasında eski makaleler korunur, yalnızca hata işaretlenir
            const prev = indexRef.current[entry.id]
            return {
                articles: prev?.articles ?? [],
                syncedAt: prev?.syncedAt ?? 0,
                error: err?.message || 'Kaynak çekilemedi',
            }
        }
    }, [])

    const syncSources = useCallback(
        async (ids?: string[]) => {
            const targets = entriesRef.current.filter((e) => !ids || ids.includes(e.id))
            if (targets.length === 0) return
            setSyncingCount((n) => n + 1)
            try {
                const results = await Promise.all(targets.map(syncOne))
                const updates: SourceIndex = {}
                targets.forEach((t, i) => {
                    updates[t.id] = results[i]
                })
                // Senkron sırasında silinen kaynakları geri yazma
                const alive = new Set(entriesRef.current.map((e) => e.id))
                for (const id of Object.keys(updates)) if (!alive.has(id)) delete updates[id]
                writeIndex(updates)
            } finally {
                setSyncingCount((n) => n - 1)
            }
        },
        [syncOne, writeIndex],
    )

    // Açılışta eskimiş kaynakları arka planda tazele (UI'ı bloklamaz)
    useEffect(() => {
        if (!ready) return
        const stale = entriesRef.current
            .filter((e) => {
                const idx = indexRef.current[e.id]
                return !idx || Date.now() - idx.syncedAt > AUTO_SYNC_AFTER_MS
            })
            .map((e) => e.id)
        if (stale.length > 0) syncSources(stale)
        // yalnızca ilk hazır oluşta
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready])

    const addSource = useCallback<CustomSourcesContextValue['addSource']>(
        async (label, url, category) => {
            const trimmedLabel = label.trim()
            if (!url.trim()) return { ok: false, error: 'Adres boş olamaz' }

            // Adres bir site ana sayfası olabilir: RSS/Atom feed'ini bul
            const found = await discoverFeed(url)
            if (!found.ok) return found

            const rssUrl = found.feedUrl
            if (entriesRef.current.some((e) => e.rssUrl === rssUrl)) {
                return { ok: false, error: 'Bu kaynak zaten ekli' }
            }

            const entry: CustomSourceEntry = {
                id: makeId(rssUrl),
                label: trimmedLabel || found.title || found.siteUrl,
                rssUrl,
                category,
                siteUrl: found.siteUrl,
                addedAt: Date.now(),
            }

            // İçeriği hemen çek ve indekse kaydet: kullanıcı ekledikten sonra
            // kaynağın makalelerini anında görür.
            const indexed = await syncOne(entry)

            const next = [...entriesRef.current, entry]
            entriesRef.current = next
            setEntries(next)
            persistEntries(next)
            writeIndex({ [entry.id]: indexed })

            return { ok: true, source: toCustomSource(entry), count: indexed.articles.length }
        },
        [syncOne, writeIndex],
    )

    const removeSource = useCallback(
        (id: string) => {
            setEntries((prev) => {
                const next = prev.filter((e) => e.id !== id)
                persistEntries(next)
                return next
            })
            writeIndex({}, [id])
        },
        [writeIndex],
    )

    // ── Türetilmiş değerler (memo: tüketici ekranlar gereksiz render almasın) ──

    const customSources = useMemo(() => entries.map(toCustomSource), [entries])

    const allArticles = useMemo(() => {
        const out: NewsArticle[] = []
        for (const e of entries) {
            const idx = index[e.id]
            if (idx) out.push(...idx.articles)
        }
        return out.sort(byDateDesc)
    }, [entries, index])

    const sourcesByCategory = useCallback(
        (category: SourceCategory) => customSources.filter((s) => s.category === category),
        [customSources],
    )

    const articlesByCategory = useCallback(
        (category: SourceCategory) => {
            const ids = new Set(customSources.filter((s) => s.category === category).map((s) => s.id))
            return allArticles.filter((a) => ids.has(a.source))
        },
        [customSources, allArticles],
    )

    const value = useMemo<CustomSourcesContextValue>(
        () => ({
            customSources,
            sourcesByCategory,
            allArticles,
            articlesByCategory,
            sourceIndex: index,
            addSource,
            removeSource,
            syncSources,
            syncing: syncingCount > 0,
            ready,
        }),
        [customSources, sourcesByCategory, allArticles, articlesByCategory, index, addSource, removeSource, syncSources, syncingCount, ready],
    )

    return <CustomSourcesContext.Provider value={value}>{children}</CustomSourcesContext.Provider>
}
