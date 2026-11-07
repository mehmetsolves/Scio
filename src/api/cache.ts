// ─── Stale-while-revalidate önbellek ─────────────────────────────────────────
//
// Sekme geçişlerinde ekranın donmasının ana sebebi, her geçişte ekranın
// sıfırdan kurulup tüm RSS/API isteklerini baştan atması ve hepsi bitene kadar
// tam ekran spinner göstermesiydi. Bu modül:
//
//  • Veriyi anahtar bazında bellekte tutar → ekran tekrar açılınca veri
//    senkron olarak, ilk render'da hazırdır (0 ms).
//  • Süresi geçmiş veriyi göstermeye devam eder, arka planda tazeler
//    (stale-while-revalidate). Kullanıcı hiçbir zaman boş ekran beklemez.
//  • Aynı anahtar için uçuştaki isteği paylaşır (çift istek yok).
//  • İsteğe bağlı olarak AsyncStorage'a yazar → uygulama soğuk açılışta da
//    son görülen içeriği hemen gösterir.

import { useCallback, useEffect, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface Entry<T> {
    data?: T
    time: number
    error?: string
    promise?: Promise<T>
}

const store = new Map<string, Entry<unknown>>()
const listeners = new Map<string, Set<() => void>>()

const STORAGE_PREFIX = '@scio_cache:'

export const DEFAULT_TTL = 5 * 60 * 1000

function emit(key: string) {
    listeners.get(key)?.forEach((fn) => fn())
}

function subscribe(key: string, fn: () => void): () => void {
    let set = listeners.get(key)
    if (!set) {
        set = new Set()
        listeners.set(key, set)
    }
    set.add(fn)
    return () => {
        set!.delete(fn)
    }
}

export function peekCache<T>(key: string): Entry<T> | undefined {
    return store.get(key) as Entry<T> | undefined
}

export function isFresh(key: string, ttl = DEFAULT_TTL): boolean {
    const e = store.get(key)
    return !!e && e.data !== undefined && Date.now() - e.time < ttl
}

// Veriyi getirir ve önbelleğe yazar. Aynı anahtar için süren bir istek varsa
// yenisini başlatmaz, onu bekler.
export function fetchCached<T>(
    key: string,
    fetcher: () => Promise<T>,
    opts: { persist?: boolean } = {},
): Promise<T> {
    const existing = store.get(key) as Entry<T> | undefined
    if (existing?.promise) return existing.promise

    const promise = fetcher()
        .then((data) => {
            store.set(key, { data, time: Date.now() })
            emit(key)
            if (opts.persist) {
                AsyncStorage.setItem(
                    STORAGE_PREFIX + key,
                    JSON.stringify({ data, time: Date.now() }),
                ).catch(() => {})
            }
            return data
        })
        .catch((err: any) => {
            const prev = store.get(key) as Entry<T> | undefined
            store.set(key, {
                data: prev?.data,
                time: prev?.time ?? 0,
                error: err?.message || 'Yüklenemedi',
            })
            emit(key)
            throw err
        })

    store.set(key, { ...(existing ?? { time: 0 }), promise })
    return promise
}

// Ekran açılmadan önce veriyi ısıtmak için (ör. uygulama açıldıktan sonra
// diğer sekmelerin verisini arka planda çekmek). Hata yutulur.
export function prefetch<T>(key: string, fetcher: () => Promise<T>, opts: { persist?: boolean; ttl?: number } = {}) {
    if (isFresh(key, opts.ttl)) return
    fetchCached(key, fetcher, opts).catch(() => {})
}

async function hydrate<T>(key: string): Promise<boolean> {
    if (store.get(key)?.data !== undefined) return true
    try {
        const raw = await AsyncStorage.getItem(STORAGE_PREFIX + key)
        if (!raw) return false
        const parsed = JSON.parse(raw) as { data: T; time: number }
        // Ağdan gelen veri bu arada yazılmışsa üzerine yazma.
        if (store.get(key)?.data !== undefined) return true
        store.set(key, { ...(store.get(key) ?? {}), data: parsed.data, time: parsed.time })
        emit(key)
        return true
    } catch {
        return false
    }
}

export interface CachedResource<T> {
    data: T | undefined
    error: string | null
    // İlk yükleme: gösterilecek hiç veri yok (skeleton gösterilmeli).
    loading: boolean
    // Elde veri var ama arka planda veya kullanıcı isteğiyle tazeleniyor.
    refreshing: boolean
    refresh: () => Promise<void>
}

// `key` null ise hiçbir şey çekilmez (ör. arama sorgusu boşken).
export function useCachedResource<T>(
    key: string | null,
    fetcher: () => Promise<T>,
    opts: { ttl?: number; persist?: boolean } = {},
): CachedResource<T> {
    const ttl = opts.ttl ?? DEFAULT_TTL
    const persist = !!opts.persist

    // fetcher her render'da yeni fonksiyon olabilir; efektleri tetiklemesin.
    const fetcherRef = useRef(fetcher)
    fetcherRef.current = fetcher

    const read = () => (key ? (store.get(key) as Entry<T> | undefined) : undefined)
    const [, force] = useState(0)
    const [manualRefresh, setManualRefresh] = useState(false)

    useEffect(() => {
        if (!key) return
        const unsub = subscribe(key, () => force((n) => n + 1))

        let cancelled = false
        ;(async () => {
            if (persist) await hydrate<T>(key)
            if (cancelled) return
            if (!isFresh(key, ttl)) {
                fetchCached(key, () => fetcherRef.current(), { persist }).catch(() => {})
            }
        })()

        return () => {
            cancelled = true
            unsub()
        }
    }, [key, ttl, persist])

    const refresh = useCallback(async () => {
        if (!key) return
        setManualRefresh(true)
        try {
            await fetchCached(key, () => fetcherRef.current(), { persist })
        } catch {
            // hata state'e yazıldı
        } finally {
            setManualRefresh(false)
        }
    }, [key, persist])

    const entry = read()
    const hasData = entry?.data !== undefined
    const inFlight = !!entry?.promise

    return {
        data: entry?.data,
        error: entry?.error ?? null,
        loading: !!key && !hasData && (inFlight || !entry?.error),
        refreshing: manualRefresh || (hasData && inFlight),
        refresh,
    }
}
