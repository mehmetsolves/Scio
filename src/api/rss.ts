// ─── RSS / XML yardımcıları ──────────────────────────────────────────────────
//
// Evrim Ağacı ve Türk haber RSS'leri aynı basit XML şeklini paylaşıyor.
// Harici parser kullanılmıyor: RN'de XML kütüphaneleri sorunlu ve feed yapısı
// sabit. Bu modül her iki istemcinin ortak kullandığı çıkarım yardımcılarını
// barındırır — tek yerde tutmak, aşağıdaki entity düzeltmesinin iki kopya
// halinde ayrışmasını önler.

// Tek bir XML tag'inin içeriğini döndürür, CDATA sarmalını soyar.
export function extractTag(xml: string, tag: string): string {
    const open = `<${tag}>`
    const close = `</${tag}>`

    const startIdx = xml.indexOf(open)
    if (startIdx === -1) return ''

    const afterOpen = startIdx + open.length
    const endIdx = xml.indexOf(close, afterOpen)
    if (endIdx === -1) return ''

    let content = xml.substring(afterOpen, endIdx).trim()

    // CDATA sarmalını soy
    if (content.startsWith('<![CDATA[') && content.endsWith(']]>')) {
        content = content.slice(9, -3)
    }

    return content
}

// Bir tag'in attribute değerini döndürür (örn. media:content url="...").
export function extractAttribute(xml: string, tag: string, attr: string): string {
    const regex = new RegExp(`<${tag}[^>]+${attr}="([^"]*)"`, 'i')
    const match = xml.match(regex)
    return match ? match[1] : ''
}

// HTML'den düz metin çıkarır ve entity'leri çözer.
//
// ÖNEMLİ — sıralama: isimli entity'ler (&amp; &lt; ...) önce, sayısal
// entity'ler (&#8217; &#128512;) sonra çözülür. Ters sırada olursa isimli
// kurallar, sayısal kural çalıştıktan sonraki metne uygulanır ve
// '&#038;' gibi çift-kodlanmış girdiler yanlış sonuç verir.
export function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&#8217;/g, "'")
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .replace(/&#8211;/g, '–')
        .replace(/&#8212;/g, '—')
        // fromCodePoint (fromCharCode değil): fromCharCode kod noktasını 16 bit
        // keser, emoji ve astral düzlem karakterleri bozulur (&#128512; → '').
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
        .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
        .trim()
}

// Link'ten kararlı, çakışmaya dirençli bir ID üretir (djb2 hash).
// Link'in son N karakterini almak farklı URL'leri aynı anahtara indirger
// (ör. BBC'nin ?at_campaign=RSS eki), bu yüzden tamamı hash'lenir.
export function makeStableId(prefix: string, link: string): string {
    let hash = 5381
    for (let i = 0; i < link.length; i++) {
        hash = ((hash << 5) + hash + link.charCodeAt(i)) >>> 0
    }
    return `${prefix}-${hash.toString(36)}`
}
