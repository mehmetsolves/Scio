import { useCallback, useEffect, useRef, useState } from 'react'
import { translateText } from '../api/client'
import { useSettings } from '../store/SettingsContext'

// ─── Ortak içerik çevirisi ───────────────────────────────────────────────────
//
// Makale detayı ve HN okuyucu bu hook'u kullanır. Hedef dil HER ZAMAN global
// `targetLanguage`'dan (SettingsContext) okunur; ekranlarda sabit 'tr' yok.
//
// Eski DetailScreen'deki hata: otomatik çeviri efektinin bağımlılık dizisi
// yalnızca [article.id] idi. Ayarlardan dil değişince efekt yeniden
// çalışmıyordu; çeviri de buton da eski dilde kalıyordu. Burada efekt
// [contentKey, targetLanguage] dinler.

export type TranslatedFields = Record<string, string>

export interface ContentTranslation<T extends TranslatedFields> {
    // Bu içerik için yapılmış tüm çeviriler (dil kodu → alanlar)
    cache: Record<string, T>
    // 'orig' = orijinal metin, aksi hâlde gösterilen dil kodu
    lang: string
    shown: T
    isTranslated: boolean
    targetLanguage: string
    // Ayarlarda eklenmiş, kaynak dilden farklı tüm diller (dil seçici için)
    languages: string[]
    translatingLang: string | null
    error: string | null
    translateTo: (code: string) => void
    // Orijinal ↔ hedef dil
    toggle: () => void
}

export function useContentTranslation<T extends TranslatedFields>(
    contentKey: string,
    fields: T,
    opts: { sourceLang?: string; auto?: boolean } = {},
): ContentTranslation<T> {
    const sourceLang = opts.sourceLang ?? 'en'
    const auto = opts.auto ?? true
    const { engine, style, apiKey, translationLangs, targetLanguage } = useSettings()

    const [lang, setLang] = useState<string>('orig')
    // Önbellek ref'te: içerik değiştiği anda (state yenilenmeden önce) eski
    // içeriğin çevirisinin yanlışlıkla gösterilmesini önler. Render için sayaç.
    const cacheRef = useRef<Record<string, T>>({})
    const [, bump] = useState(0)
    const cache = cacheRef.current
    const [translatingLang, setTranslatingLang] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const langRef = useRef(lang)
    langRef.current = lang

    // Async çağrıların güncel değerleri görmesi için ref'ler (stale closure yok)
    const latest = useRef({ fields, engine, style, apiKey, contentKey })
    latest.current = { fields, engine, style, apiKey, contentKey }
    // Her istek bir numara alır; eski istek geç dönerse yenisinin üstüne yazmaz
    const requestId = useRef(0)

    const translateTo = useCallback(
        async (code: string) => {
            if (code === 'orig' || code === sourceLang) {
                requestId.current++
                setTranslatingLang(null)
                setLang('orig')
                return
            }
            const { fields: f, engine: e, style: st, apiKey: k, contentKey: key } = latest.current
            const c = cacheRef.current
            if (c[code]) {
                setLang(code)
                setError(null)
                return
            }
            const id = ++requestId.current
            setTranslatingLang(code)
            setError(null)
            try {
                const out: TranslatedFields = {}
                // Sıralı: ücretsiz motor paralel isteklerde hız sınırına takılıyor
                for (const [name, text] of Object.entries(f)) {
                    out[name] = text
                        ? await translateText(text, { style: st, engine: e, apiKey: k || undefined, sourceLang, targetLang: code })
                        : text
                }
                if (id !== requestId.current || key !== latest.current.contentKey) return
                cacheRef.current = { ...cacheRef.current, [code]: out as T }
                bump((n) => n + 1)
                setLang(code)
            } catch (err: any) {
                if (id === requestId.current) setError(err?.message || 'Çeviri başarısız')
            } finally {
                if (id === requestId.current) setTranslatingLang(null)
            }
        },
        [sourceLang],
    )

    // İçerik değişince önbelleği sıfırla
    useEffect(() => {
        requestId.current++
        cacheRef.current = {}
        setLang('orig')
        setError(null)
        setTranslatingLang(null)
    }, [contentKey])

    // Açılışta ve hedef dil her değiştiğinde otomatik çeviri
    useEffect(() => {
        if (!auto) {
            // Otomatik değilse ama kullanıcı çeviri görüyorsa, yeni dile geç
            const cur = langRef.current
            if (cur !== 'orig' && cur !== targetLanguage) translateTo(targetLanguage)
            return
        }
        if (targetLanguage === sourceLang) {
            translateTo('orig')
            return
        }
        translateTo(targetLanguage)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contentKey, targetLanguage, auto])

    // Bileşen kapanınca bekleyen çeviriler state'e yazmasın
    useEffect(
        () => () => {
            requestId.current++
        },
        [],
    )

    const shown = (lang !== 'orig' && cache[lang]) || fields
    const isTranslated = lang !== 'orig' && !!cache[lang]

    const toggle = useCallback(() => {
        if (translatingLang) return
        translateTo(isTranslated ? 'orig' : targetLanguage)
    }, [translatingLang, isTranslated, targetLanguage, translateTo])

    return {
        cache,
        lang: isTranslated ? lang : 'orig',
        shown,
        isTranslated,
        targetLanguage,
        languages: translationLangs.filter((c) => c !== sourceLang),
        translatingLang,
        error,
        translateTo,
        toggle,
    }
}
