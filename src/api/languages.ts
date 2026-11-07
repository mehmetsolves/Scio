// ─── Çeviri dilleri ──────────────────────────────────────────────────────────
//
// `code`: MyMemory / Google Translate / Worker'a giden dil kodu.
// Ayarlar'da kullanıcı bu listeden birden fazla dil ekleyebilir; ilk eklenen
// (varsayılan) makale açılınca otomatik çeviri dilidir.

export interface Language {
    code: string
    label: string // Türkçe adı (arayüzde)
    flag: string
}

export const LANGUAGES: Language[] = [
    { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
    { code: 'en', label: 'İngilizce', flag: '🇬🇧' },
    { code: 'de', label: 'Almanca', flag: '🇩🇪' },
    { code: 'fr', label: 'Fransızca', flag: '🇫🇷' },
    { code: 'es', label: 'İspanyolca', flag: '🇪🇸' },
    { code: 'it', label: 'İtalyanca', flag: '🇮🇹' },
    { code: 'pt', label: 'Portekizce', flag: '🇵🇹' },
    { code: 'nl', label: 'Felemenkçe', flag: '🇳🇱' },
    { code: 'ru', label: 'Rusça', flag: '🇷🇺' },
    { code: 'uk', label: 'Ukraynaca', flag: '🇺🇦' },
    { code: 'pl', label: 'Lehçe', flag: '🇵🇱' },
    { code: 'az', label: 'Azerbaycanca', flag: '🇦🇿' },
    { code: 'ar', label: 'Arapça', flag: '🇸🇦' },
    { code: 'fa', label: 'Farsça', flag: '🇮🇷' },
    { code: 'ja', label: 'Japonca', flag: '🇯🇵' },
    { code: 'ko', label: 'Korece', flag: '🇰🇷' },
    { code: 'zh-CN', label: 'Çince', flag: '🇨🇳' },
]

// Yeni kurulumda varsayılan hedef dil İngilizce. İngilizce kaynaklar
// (arXiv, HN) orijinal gösterilir; Türkçe kaynaklar (haberler, Evrim Ağacı)
// İngilizceye çevrilebilir. Kullanıcının kaydettiği seçim bunu ezer.
export const DEFAULT_TRANSLATION_LANGS = ['en']

export function getLanguage(code: string): Language {
    return LANGUAGES.find((l) => l.code === code) ?? { code, label: code.toUpperCase(), flag: '🌐' }
}
