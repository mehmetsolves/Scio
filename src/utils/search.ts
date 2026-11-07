// ─── Ortak istemci tarafı arama ──────────────────────────────────────────────
//
// Uygulamadaki tüm yerel aramalar (Gündem, Bilim, Teknoloji, Kaynaklarım,
// Makaleler) bu modülü kullanır; böylece eşleşme kuralı her sekmede aynıdır.
//
// Neden `toLowerCase()` yetmiyor: JavaScript'te 'İ'.toLowerCase() → 'i̇'
// (i + birleşik nokta U+0307) olur. "istanbul" araması "İstanbul" başlığını
// bulamıyordu — Gündem aramasının boş dönmesinin asıl sebebi buydu. Ayrıca
// kullanıcılar çoğu zaman Türkçe karakter yazmadan arar ("sozcu", "gunes").
// Bu yüzden hem sorgu hem metin aynı şekilde "katlanır": küçük harf + Türkçe
// ve aksanlı harflerin ASCII karşılığı.

const FOLD_MAP: Record<string, string> = {
    ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u',
    â: 'a', î: 'i', û: 'u',
    á: 'a', à: 'a', ä: 'a', ã: 'a', å: 'a',
    é: 'e', è: 'e', ê: 'e', ë: 'e',
    í: 'i', ì: 'i', ï: 'i',
    ó: 'o', ò: 'o', ô: 'o', õ: 'o',
    ú: 'u', ù: 'u',
    ñ: 'n', ß: 'ss',
}

const FOLD_RE = /[çğıöşüâîûáàäãåéèêëíìïóòôõúùñß]/g

export function normalizeForSearch(text: string | null | undefined): string {
    if (!text) return ''
    return text
        .replace(/[İI]/g, 'i')
        .toLowerCase()
        .replace(/̇/g, '')
        .replace(FOLD_RE, (ch) => FOLD_MAP[ch] ?? ch)
        .replace(/\s+/g, ' ')
        .trim()
}

// Sorguyu kelimelere ayırır. Tüm kelimeler (sırası fark etmeksizin) metinde
// geçmelidir: "yapay zeka" → hem "yapay" hem "zeka".
export function tokenize(query: string): string[] {
    return normalizeForSearch(query).split(' ').filter(Boolean)
}

// Aynı öğe her tuş vuruşunda yeniden katlanmasın diye nesne başına önbellek.
// WeakMap: öğe listeden çıkınca kayıt da çöpe gider.
const haystackCache = new WeakMap<object, string>()

function haystackOf<T extends object>(item: T, fields: (item: T) => (string | null | undefined)[]): string {
    let cached = haystackCache.get(item)
    if (cached === undefined) {
        cached = fields(item).map(normalizeForSearch).join(' \u0000 ')
        haystackCache.set(item, cached)
    }
    return cached
}

// Listeyi sorguya göre süzer. Boş sorgu listeyi olduğu gibi döndürür (aynı
// referans — useMemo zincirlerinde gereksiz render'ı önler).
export function searchItems<T extends object>(
    items: T[],
    query: string,
    fields: (item: T) => (string | null | undefined)[],
): T[] {
    const tokens = tokenize(query)
    if (tokens.length === 0) return items
    return items.filter((item) => {
        const hay = haystackOf(item, fields)
        return tokens.every((t) => hay.includes(t))
    })
}

export function matchesQuery(fields: (string | null | undefined)[], query: string): boolean {
    const tokens = tokenize(query)
    if (tokens.length === 0) return true
    const hay = fields.map(normalizeForSearch).join(' \u0000 ')
    return tokens.every((t) => hay.includes(t))
}
