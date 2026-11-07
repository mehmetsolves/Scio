// Google'ın sayfa çeviri proxy'si:
//   https://arxiv.org/abs/x → https://arxiv-org.translate.goog/abs/x?_x_tr_sl=auto&_x_tr_tl=<dil>
// Eski translate.google.com/translate?u= adresi buraya 302 ile yönleniyor;
// doğrudan gitmek bir yönlendirmeyi atlar. WebView ve HN okuyucu ortak kullanır,
// hedef dil her zaman çağırandan (global targetLanguage) gelir — sabit dil yok.
export function googleTranslateUrl(pageUrl: string, targetLang: string): string {
    const m = pageUrl.match(/^https?:\/\/([^/?#:]+)([^?#]*)(\?[^#]*)?(#.*)?$/i)
    if (!m) {
        return `https://translate.google.com/translate?sl=auto&tl=${encodeURIComponent(targetLang)}&u=${encodeURIComponent(pageUrl)}`
    }
    const [, host, path, query = '', hash = ''] = m
    const proxyHost = host.replace(/-/g, '--').replace(/\./g, '-') + '.translate.goog'
    const params = `_x_tr_sl=auto&_x_tr_tl=${encodeURIComponent(targetLang)}&_x_tr_hl=${encodeURIComponent(targetLang)}`
    const q = query ? `${query}&${params}` : `?${params}`
    return `https://${proxyHost}${path || '/'}${q}${hash}`
}
