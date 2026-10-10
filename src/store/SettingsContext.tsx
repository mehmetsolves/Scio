import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

// ─── Types ───────────────────────────────────────────────────────────────────

export type SourceName = 'arxiv' | 'semanticscholar' | 'openalex'
export type Engine = 'anthropic' | 'openai' | 'mymemory' | 'groq' | 'gemini'
export type TranslationStyle = 'academic' | 'simple'

interface SettingsState {
    sources: SourceName[]
    darkMode: boolean
    engine: Engine
    style: TranslationStyle
    apiKey: string
    selectedTopics: string[]
    hasCompletedOnboarding: boolean
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
}

type SettingsContextValue = SettingsState & SettingsActions

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_SOURCES: SourceName[] = ['arxiv', 'semanticscholar', 'openalex']
const STORAGE_KEY = '@wordreads_settings'
const SECURE_KEY = 'wordreads_api_key'

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
    const [ready, setReady] = useState(false)

    // ── Load persisted values on mount ──
    useEffect(() => {
        ;(async () => {
            try {
                const raw = await AsyncStorage.getItem(STORAGE_KEY)
                if (raw) {
                    const parsed = JSON.parse(raw)
                    if (Array.isArray(parsed.sources) && parsed.sources.length > 0) setSources(parsed.sources)
                    if (typeof parsed.darkMode === 'boolean') setDarkModeState(parsed.darkMode)
                    if (parsed.engine) setEngineState(parsed.engine)
                    if (parsed.style) setStyleState(parsed.style)
                    if (Array.isArray(parsed.selectedTopics)) setSelectedTopicsState(parsed.selectedTopics)
                    if (typeof parsed.hasCompletedOnboarding === 'boolean') setHasCompletedOnboardingState(parsed.hasCompletedOnboarding)
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
                ready,
                toggleSource,
                setDarkMode,
                setEngine,
                setStyle,
                setApiKey,
                setSelectedTopics,
                completeOnboarding,
            }}
        >
            {children}
        </SettingsContext.Provider>
    )
}
