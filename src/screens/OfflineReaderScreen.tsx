import { useMemo, useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet, Linking } from 'react-native'
import { WebView } from 'react-native-webview'
import Ionicons from '@expo/vector-icons/Ionicons'
import { pageFile, pagesDirUri } from '../store/pageStore'
import type { ColorScheme } from '../theme/colors'
import { translatedLangOf, type DownloadedArticle } from '../store/DownloadsContext'
import { getLanguage } from '../api/languages'

const SERIF = 'SourceSerif4_400Regular'
const SERIF_BOLD = 'SourceSerif4_700Bold'
const SERIF_SEMIBOLD = 'SourceSerif4_600SemiBold'
const SANS = 'Inter_400Regular'
const SANS_SEMIBOLD = 'Inter_600SemiBold'

// Çevrimdışı okuyucu, iki görünüm:
//  • Sayfa: indirilen tam HTML kopyası (CSS ve görseller gömülü) — sitede
//    göründüğü gibi. JS kapalı; bağlantılar sistem tarayıcısında açılır.
//  • Metin: çıkarılmış düz metin + kayıtlı çeviri.
// Hiçbiri ağa ihtiyaç duymaz.

function formatBytes(n?: number): string {
    if (!n) return ''
    return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`
}
export default function OfflineReaderScreen({
    article,
    onBack,
    colors,
}: {
    article: DownloadedArticle
    onBack: () => void
    colors: ColorScheme
}) {
    // Kayıtlı çevirinin dili (sabit 'tr' değil; indirme anındaki global dil)
    const trLang = getLanguage(translatedLangOf(article))
    const origLang = getLanguage(article.origLang)
    const [lang, setLang] = useState<'orig' | 'tr'>('tr')
    const [showSynopsis, setShowSynopsis] = useState(true)

    // Tam sayfa kopyası varsa (yeni indirmeler) varsayılan görünüm "Sayfa"
    const pageUri = useMemo(() => {
        if (!article.pageFile) return null
        try {
            const f = pageFile(article.pageFile)
            return f.exists ? f.uri : null
        } catch {
            return null
        }
    }, [article.pageFile])
    const [view, setView] = useState<'page' | 'text'>(pageUri ? 'page' : 'text')

    const isTrShown = lang === 'tr'
    const title = isTrShown && article.titleTr ? article.titleTr : article.title
    const description = isTrShown && article.descriptionTr ? article.descriptionTr : article.description
    const body = isTrShown && article.bodyTr ? article.bodyTr : article.body

    const paragraphs = body.split('\n\n').map((p) => p.trim()).filter(Boolean)

    const toggleLang = () => setLang((l) => (l === 'orig' ? 'tr' : 'orig'))

    return (
        <View style={{ flex: 1, backgroundColor: colors.cream }}>
            {/* Nav */}
            <View style={[s.navBar, { borderBottomColor: colors.border, backgroundColor: colors.cream }]}>
                <View style={s.navRow}>
                    <Pressable
                        onPress={onBack}
                        hitSlop={8}
                        accessibilityLabel="Geri"
                        accessibilityRole="button"
                        style={{ padding: 6 }}
                    >
                        <Text style={[s.backArrow, { color: colors.burgundy }]}>←</Text>
                    </Pressable>
                    <Text style={[s.navTitle, { color: colors.ink }]} numberOfLines={1}>
                        {article.source}
                    </Text>
                    {pageUri && (
                        <View style={[s.segment, { borderColor: colors.border }]}>
                            {(['page', 'text'] as const).map((v) => {
                                const active = view === v
                                return (
                                    <Pressable
                                        key={v}
                                        onPress={() => setView(v)}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: active }}
                                        accessibilityLabel={v === 'page' ? 'Sayfa görünümü' : 'Metin görünümü'}
                                        style={[s.segmentBtn, active && { backgroundColor: colors.burgundy }]}
                                    >
                                        <Ionicons
                                            name={v === 'page' ? 'globe-outline' : 'document-text-outline'}
                                            size={13}
                                            color={active ? '#FFFFFF' : colors.muted}
                                        />
                                        <Text style={[s.segmentText, { color: active ? '#FFFFFF' : colors.muted }]}>
                                            {v === 'page' ? 'Sayfa' : 'Metin'}
                                        </Text>
                                    </Pressable>
                                )
                            })}
                        </View>
                    )}
                    {view === 'text' && (
                    <Pressable
                        onPress={toggleLang}
                        hitSlop={8}
                        accessibilityLabel={isTrShown ? 'Orijinal dili göster' : `${trLang.label} çeviriyi göster`}
                        accessibilityRole="button"
                        style={[s.langChip, { backgroundColor: colors.burgundyTint }]}
                    >
                        <Text style={{ fontSize: 13 }}>{isTrShown ? origLang.flag : trLang.flag}</Text>
                        <Text style={[s.langChipText, { color: colors.burgundy }]}>
                            {isTrShown ? `Orijinal (${origLang.label})` : trLang.label}
                        </Text>
                    </Pressable>
                    )}
                </View>
            </View>

            {view === 'page' && pageUri ? (
                <WebView
                    source={{ uri: pageUri }}
                    style={{ flex: 1, backgroundColor: '#FFFFFF' }}
                    originWhitelist={['*']}
                    // Kayıtlı dosyayı okuyabilmek için
                    allowFileAccess
                    allowFileAccessFromFileURLs
                    allowingReadAccessToURL={pagesDirUri()}
                    // Kaydedilen sayfada script yok; yine de JS kapalı açılır
                    javaScriptEnabled={false}
                    // Bağlantıya dokununca sistem tarayıcısında aç (internet
                    // gerekir); kayıtlı sayfa yerinde kalır
                    onShouldStartLoadWithRequest={(req) => {
                        if (/^(file|about|data|blob):/i.test(req.url)) return true
                        if (/^https?:/i.test(req.url)) Linking.openURL(req.url).catch(() => {})
                        return false
                    }}
                />
            ) : (

            <ScrollView style={{ flex: 1 }} contentContainerStyle={s.bodyContainer}>
                {/* Title */}
                <Text style={[s.title, { color: colors.ink }]}>{title}</Text>

                {/* Meta date */}
                <Text style={[s.meta, { color: colors.mutedLight }]}>
                    {new Date(article.savedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>

                {/* Synopsis (description) */}
                {description ? (
                    <View style={[s.synopsisBox, { backgroundColor: colors.abstractBg, borderColor: colors.border }]}>
                        <Pressable onPress={() => setShowSynopsis((v) => !v)} style={s.synopsisHeader}>
                            <Text style={[s.synopsisLabel, { color: colors.burgundy }]}>
                                {description ? 'Özet' : ''}
                            </Text>
                            <Text style={{ color: colors.muted, fontSize: 13 }}>
                                {showSynopsis ? '▲' : '▼'}
                            </Text>
                        </Pressable>
                        {showSynopsis && (
                            <Text style={[s.synopsisText, { color: colors.abstractText }]}>
                                {description}
                            </Text>
                        )}
                    </View>
                ) : null}

                {/* Body */}
                {paragraphs.length > 0 ? (
                    paragraphs.map((p, i) => (
                        <Text key={i} style={[s.bodyText, { color: colors.ink }]} selectable>
                            {p}
                        </Text>
                    ))
                ) : (
                    <View style={[s.emptyBody, { backgroundColor: colors.abstractBg, borderColor: colors.border }]}>
                        <Text style={{ fontSize: 28, marginBottom: 8 }}>📄</Text>
                        <Text style={[s.emptyBodyText, { color: colors.ink }]}>
                            Bu sayfanın tam metni indirilemedi
                        </Text>
                        <Text style={[s.emptyBodySub, { color: colors.muted }]}>
                            Sadece başlık ve özet kaydedildi. Çevrimiçi olduğunda makaleyi yeniden indirmeyi dene.
                        </Text>
                    </View>
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
            )}
            {view === 'page' && article.pageBytes ? (
                <Text style={[s.pageInfo, { color: colors.mutedLight, borderTopColor: colors.border, backgroundColor: colors.cream }]}>
                    Çevrimdışı kopya · {formatBytes(article.pageBytes)}
                    {article.pageImages ? ` · ${article.pageImages} görsel` : ''}
                </Text>
            ) : null}
        </View>
    )
}

const s = StyleSheet.create({
    navBar: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        gap: 2,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    backArrow: { fontSize: 18 },
    navTitle: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 13,
        flex: 1,
    },
    langChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 18,
    },
    segment: {
        flexDirection: 'row',
        borderWidth: 1,
        borderRadius: 16,
        overflow: 'hidden',
    },
    segmentBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    segmentText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 11,
    },
    pageInfo: {
        fontFamily: SANS,
        fontSize: 11,
        textAlign: 'center',
        paddingVertical: 6,
        borderTopWidth: 1,
    },
    langChipText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 12,
    },
    bodyContainer: {
        padding: 22,
        paddingTop: 18,
        gap: 16,
    },
    title: {
        fontFamily: SERIF_BOLD,
        fontSize: 24,
        lineHeight: 31,
        marginBottom: 2,
    },
    meta: {
        fontFamily: SANS,
        fontSize: 11,
        marginBottom: 6,
    },
    synopsisBox: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        marginBottom: 4,
    },
    synopsisHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    synopsisLabel: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 12,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    synopsisText: {
        fontFamily: SERIF,
        fontSize: 14,
        lineHeight: 24,
    },
    bodyText: {
        fontFamily: SERIF,
        fontSize: 16,
        lineHeight: 27,
        textAlign: 'justify',
    },
    emptyBody: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
    },
    emptyBodyText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 6,
    },
    emptyBodySub: {
        fontFamily: SANS,
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },
})
