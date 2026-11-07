import { useEffect, useState } from 'react'

// Arama kutusu için varsayılan bekleme. 300-500 ms aralığının ortası: hızlı
// yazarken ara sonuçlar için istek atılmaz, durunca beklemeden sonuç gelir.
export const SEARCH_DEBOUNCE_MS = 350

// Değer `delay` ms boyunca değişmeden kalınca güncellenir. Boş değere geçiş
// (arama temizlendi) beklemeden uygulanır — liste anında eski hâline döner.
export function useDebouncedValue<T>(value: T, delay = SEARCH_DEBOUNCE_MS): T {
    const [debounced, setDebounced] = useState(value)

    useEffect(() => {
        if (value === '' || value == null) {
            setDebounced(value)
            return
        }
        const t = setTimeout(() => setDebounced(value), delay)
        return () => clearTimeout(t)
    }, [value, delay])

    return debounced
}
