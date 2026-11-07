// ─── URL yardımcıları ────────────────────────────────────────────────────────
// React Native'in `URL` sınıfı eksik (bazı sürümlerde `origin`/`hostname`
// "not implemented" hatası atıyor). Bu yüzden göreli adresler elle çözülür.

export function originOf(url: string): string {
    const m = url.match(/^([a-z][a-z0-9+.-]*:\/\/[^/?#]+)/i)
    return m ? m[1] : url
}

function normalizePath(path: string): string {
    const out: string[] = []
    for (const seg of path.split('/')) {
        if (seg === '..') out.pop()
        else if (seg !== '.') out.push(seg)
    }
    return out.join('/')
}

// `href`'i `base`'e göre mutlak adrese çevirir (tarayıcının yaptığı gibi).
export function resolveUrl(href: string, base: string): string {
    const h = href.trim()
    if (!h) return base
    if (/^[a-z][a-z0-9+.-]*:/i.test(h)) return h // http:, https:, data:, mailto:
    if (h.startsWith('//')) return (base.match(/^([a-z]+:)/i)?.[1] ?? 'https:') + h
    const origin = originOf(base)
    if (h.startsWith('#')) return base.split('#')[0] + h
    if (h.startsWith('?')) return base.split(/[?#]/)[0] + h
    if (h.startsWith('/')) return origin + normalizePath(h)
    const clean = base.split(/[?#]/)[0]
    const pathPart = clean.slice(origin.length) || '/'
    const dir = pathPart.endsWith('/') ? pathPart : pathPart.slice(0, pathPart.lastIndexOf('/') + 1)
    return origin + normalizePath(dir + h)
}
