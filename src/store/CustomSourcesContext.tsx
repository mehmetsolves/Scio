import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
    validateRssUrl,
    normalizeFeedUrl,
    CUSTOM_SOURCE_COLOR,
    type NewsSource,
} from '../api/news'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CustomSourceEntry {
    id: string
    label: string
    rssUrl: string
}

interface CustomSourcesContextValue {
    customSources: NewsSource[]
    addSource: (label: string, url: string) => Promise<{ ok: true } | { ok: false; error: string }>
    removeSource: (id: string) => void
    ready: boolean
}

const STORAGE_KEY = '@scio_custom_news_sources'
const LEGACY_STORAGE_KEY = '@wordreads_custom_news_sources'

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

function toNewsSource(entry: CustomSourceEntry): NewsSource {
    return {
        id: entry.id,
        label: entry.label,
        rssUrl: entry.rssUrl,
        // Özel kaynaklara sabit nötr renk veriliyor: herkese ayrı renk atmak
        // birkaç kaynaktan sonra kaynak kimliğini okunamaz hâle getiriyor.
        color: CUSTOM_SOURCE_COLOR,
        bg: 'transparent',
        icon: '📡',
    }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function CustomSourcesProvider({ children }: { children: ReactNode }) {
    const [entries, setEntries] = useState<CustomSourceEntry[]>([])
    const [ready, setReady] = useState(false)

    // ── Load on mount (with legacy migration) ──
    useEffect(() => {
        ;(async () => {
            try {
                const raw = await AsyncStorage.getItem(STORAGE_KEY)
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
            } catch (e) {
                console.warn('Failed to load custom sources:', e)
            } finally {
                setReady(true)
            }
        })()
    }, [])

    const persist = (next: CustomSourceEntry[]) => {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((e) =>
            console.warn('Failed to persist custom sources:', e),
        )
    }

    const addSource = useCallback<CustomSourcesContextValue['addSource']>(
        async (label, url) => {
            const trimmedLabel = label.trim()
            const rssUrl = normalizeFeedUrl(url)

            if (!trimmedLabel) return { ok: false, error: 'Site adı boş olamaz' }
            if (!rssUrl) return { ok: false, error: 'Adres boş olamaz' }

            // Aynı adres zaten kayıtlıysa tekrar eklemeye gerek yok.
            const existing = entries.find((e) => e.rssUrl === rssUrl)
            if (existing) return { ok: false, error: 'Bu site zaten ekli' }

            // Kaydetmeden önce adresin gerçekten bir feed olduğunu doğrula;
            // HTTP kontrolü yetmez, HTML sayfası da 200 dönebilir.
            const check = await validateRssUrl(rssUrl)
            if (!check.ok) return check

            const entry: CustomSourceEntry = { id: makeId(rssUrl), label: trimmedLabel, rssUrl }
            const next = [...entries, entry]
            setEntries(next)
            persist(next)
            return { ok: true }
        },
        [entries],
    )

    const removeSource = useCallback(
        (id: string) => {
            setEntries((prev) => {
                const next = prev.filter((e) => e.id !== id)
                persist(next)
                return next
            })
        },
        [],
    )

    const customSources = entries.map(toNewsSource)

    return (
        <CustomSourcesContext.Provider value={{ customSources, addSource, removeSource, ready }}>
            {children}
        </CustomSourcesContext.Provider>
    )
}
