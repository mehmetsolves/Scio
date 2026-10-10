import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

// ─── Types ───────────────────────────────────────────────────────────────────

export type SourceName = 'arxiv' | 'semanticscholar' | 'openalex'
export type Engine = 'anthropic' | 'openai' | 'mymemory' | 'groq' | 'gemini'
export type TranslationStyle = 'academic' | 'simple'
export type CategoryId = 'discover' | 'evrimagaci' | 'hn' | 'news'

interface SettingsState {
    sources: SourceName[]
    darkMode: boolean
    engine: Engine
    style: TranslationStyle
    apiKey: string
    selectedTopics: string[]
    hasCompletedOnboarding: boolean
    hiddenTabs: CategoryId[] // Ayarlar'dan kapatılan alt bar sekmeleri
    ready: boolean // true once persisted values are loaded
}

interface SettingsActions {
    toggleSource: (s: SourceName) => void
    setDarkMode: (v: boolean) => void
    setEngine: (e: Engine) => void
    setStyle: (s: TranslationStyle) => void
    setApiKey: (k: string) => void
    setSelectedTopics: (topics: string[]) => void
    completeOnboarding: () => void
    toggleTab: (t: CategoryId) => void
}

type SettingsContextValue = SettingsState & SettingsActions

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_SOURCES: SourceName[] = ['arxiv', 'semanticscholar', 'openalex']
const STORAGE_KEY = '@scio_settings'
const SECURE_KEY = 'scio_api_key'
// WordReads → Scio yeniden adlandırması öncesi kullanılan anahtarlar.
// Bir kereliğine okunup yeni anahtarlara taşınır (bkz. migrateLegacyKeys).
const LEGACY_STORAGE_KEY = '@wordreads_settings'
const LEGACY_SECURE_KEY = 'wordreads_api_key'

// Eski anahtarları yeni adlara tek seferde taşır. Taşıma başarılı olunca eski
// kayıt silinir; böylece bir sonraki açılışta tekrar okunmaz ve kullanıcı
// ayarlarını/API anahtarını kaybetmez.
async function migrateLegacyKeys(): Promise<void> {
    try {
        const legacyRaw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY)
        if (legacyRaw) {
            const current = await AsyncStorage.getItem(STORAGE_KEY)
            // Yeni anahtar zaten doluysa taşımaya gerek yok, sadece artığı temizle.
            if (!current) await AsyncStorage.setItem(STORAGE_KEY, legacyRaw)
            await AsyncStorage.removeItem(LEGACY_STORAGE_KEY)
        }
    } catch (e) {
        console.warn('Failed to migrate legacy settings:', e)
    }

    try {
        const legacyKey = await SecureStore.getItemAsync(LEGACY_SECURE_KEY)
        if (legacyKey) {
            const currentKey = await SecureStore.getItemAsync(SECURE_KEY)
            if (!currentKey) await SecureStore.setItemAsync(SECURE_KEY, legacyKey)
            await SecureStore.deleteItemAsync(LEGACY_SECURE_KEY)
        }
    } catch (e) {
        console.warn('Failed to migrate legacy API key:', e)
    }
}

// ─── Context ─────────────────────────────────────────────────────────────────

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings(): SettingsContextValue {
    const ctx = useContext(SettingsContext)
    if (!ctx) throw new Error('useSettings must be used within <SettingsProvider>')
    return ctx
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [sources, setSources] = useState<SourceName[]>(DEFAULT_SOURCES)
    const [darkMode, setDarkModeState] = useState(false)
    const [engine, setEngineState] = useState<Engine>('mymemory')
    const [style, setStyleState] = useState<TranslationStyle>('academic')
    const [apiKey, setApiKeyState] = useState('')
    const [selectedTopics, setSelectedTopicsState] = useState<string[]>([])
    const [hasCompletedOnboarding, setHasCompletedOnboardingState] = useState(false)
    const [hiddenTabs, setHiddenTabs] = useState<CategoryId[]>([])
    const [ready, setReady] = useState(false)

    // ── Load persisted values on mount ──
    useEffect(() => {
        ;(async () => {
            try {
                await migrateLegacyKeys()
                const raw = await AsyncStorage.getItem(STORAGE_KEY)
                if (raw) {
                    const parsed = JSON.parse(raw)
                    if (Array.isArray(parsed.sources) && parsed.sources.length > 0) setSources(parsed.sources)
                    if (typeof parsed.darkMode === 'boolean') setDarkModeState(parsed.darkMode)
                    if (parsed.engine) setEngineState(parsed.engine)
                    if (parsed.style) setStyleState(parsed.style)
                    if (Array.isArray(parsed.selectedTopics)) setSelectedTopicsState(parsed.selectedTopics)
                    if (typeof parsed.hasCompletedOnboarding === 'boolean') setHasCompletedOnboardingState(parsed.hasCompletedOnboarding)
                    if (Array.isArray(parsed.hiddenTabs)) setHiddenTabs(parsed.hiddenTabs)
                }
                const storedKey = await SecureStore.getItemAsync(SECURE_KEY)
                if (storedKey) setApiKeyState(storedKey)
            } catch (e) {
                console.warn('Failed to load settings:', e)
            } finally {
                setReady(true)
            }
        })()
    }, [])

    // ── Persist helpers ──
    const persist = (patch: Record<string, unknown>) => {
        ;(async () => {
            try {
                const raw = await AsyncStorage.getItem(STORAGE_KEY)
                const current = raw ? JSON.parse(raw) : {}
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }))
            } catch (e) {
                console.warn('Failed to persist settings:', e)
            }
        })()
    }

    // ── Actions ──
    const toggleSource = (s: SourceName) => {
        setSources((prev) => {
            const exists = prev.includes(s)
            // Don't allow removing the last source
            if (exists && prev.length <= 1) return prev
            const next = exists ? prev.filter((x) => x !== s) : [...prev, s]
            persist({ sources: next })
            return next
        })
    }

    const setDarkMode = (v: boolean) => {
        setDarkModeState(v)
        persist({ darkMode: v })
    }

    const setEngine = (e: Engine) => {
        setEngineState(e)
        persist({ engine: e })
    }

    const setStyle = (s: TranslationStyle) => {
        setStyleState(s)
        persist({ style: s })
    }

    const setApiKey = (k: string) => {
        setApiKeyState(k)
        ;(async () => {
            try {
                if (k) {
                    await SecureStore.setItemAsync(SECURE_KEY, k)
                } else {
                    await SecureStore.deleteItemAsync(SECURE_KEY)
                }
            } catch (e) {
                console.warn('Failed to persist API key:', e)
            }
        })()
    }

    const setSelectedTopics = (topics: string[]) => {
        setSelectedTopicsState(topics)
        persist({ selectedTopics: topics })
    }

    const completeOnboarding = () => {
        setHasCompletedOnboardingState(true)
        persist({ hasCompletedOnboarding: true })
    }

    // Sekmeyi aç/kapa. Keşfet sabittir — uygulamanın açılış ekranı olduğu için
    // kapatılamaz; tüm sekmelerin kapanması kullanıcıyı içeriksiz bırakırdı.
    const toggleTab = (t: CategoryId) => {
        if (t === 'discover') return
        setHiddenTabs((prev) => {
            const hidden = prev.includes(t)
            const next = hidden ? prev.filter((x) => x !== t) : [...prev, t]
            // Son görünür sekmeyi kapatmaya izin verme
            const visibleCount = 4 - next.length
            if (visibleCount < 1) return prev
            persist({ hiddenTabs: next })
            return next
        })
    }

    return (
        <SettingsContext.Provider
            value={{
                sources,
                darkMode,
                engine,
                style,
                apiKey,
                selectedTopics,
                hasCompletedOnboarding,
                hiddenTabs,
                ready,
                toggleSource,
                setDarkMode,
                setEngine,
                setStyle,
                setApiKey,
                setSelectedTopics,
                completeOnboarding,
                toggleTab,
            }}
        >
            {children}
        </SettingsContext.Provider>
    )
}
