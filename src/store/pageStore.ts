// ─── Kaydedilen HTML sayfalarının dosya deposu ──────────────────────────────
//
// Sayfalar AsyncStorage'a DEĞİL, uygulamanın belge klasörüne dosya olarak
// yazılır: görselleri gömülü bir sayfa birkaç MB tutabilir; Android'de
// AsyncStorage'ın toplam sınırı (~6 MB) birkaç makalede dolardı. Belge klasörü
// sistem tarafından silinmez (önbellek klasörünün aksine).

import { Directory, File, Paths } from 'expo-file-system'

const DIR_NAME = 'saved-pages'

function pagesDir(): Directory {
    const dir = new Directory(Paths.document, DIR_NAME)
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true })
    return dir
}

function fileNameFor(id: string): string {
    return id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) + '.html'
}

export async function savePageHtml(id: string, html: string): Promise<{ fileName: string; uri: string }> {
    const dir = pagesDir()
    const fileName = fileNameFor(id)
    const file = new File(dir, fileName)
    if (file.exists) file.delete()
    file.create()
    await file.write(html)
    return { fileName, uri: file.uri }
}

export function pageFile(fileName: string): File {
    return new File(pagesDir(), fileName)
}

export function pagesDirUri(): string {
    return pagesDir().uri
}

export function deletePageHtml(fileName: string): void {
    try {
        const file = new File(pagesDir(), fileName)
        if (file.exists) file.delete()
    } catch (e) {
        console.warn('Failed to delete saved page:', e)
    }
}
