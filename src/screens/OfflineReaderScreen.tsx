import { useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import type { ColorScheme } from '../theme/colors'
import type { DownloadedArticle } from '../store/DownloadsContext'

const SERIF = 'SourceSerif4_400Regular'
const SERIF_BOLD = 'SourceSerif4_700Bold'
const SERIF_SEMIBOLD = 'SourceSerif4_600SemiBold'
const SANS = 'Inter_400Regular'
const SANS_SEMIBOLD = 'Inter_600SemiBold'

// A clean-text offline reader. Renders the stored original/translation pair and
// never calls the network — that's the whole point of a downloaded article.
export default function OfflineReaderScreen({
    article,
    onBack,
    colors,
}: {
    article: DownloadedArticle
    onBack: () => void
    colors: ColorScheme
}) {
    const [lang, setLang] = useState<'orig' | 'tr'>(article.origLang === 'tr' ? 'orig' : 'tr')
    const [showSynopsis, setShowSynopsis] = useState(true)

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
                    <Pressable onPress={onBack} hitSlop={8} style={{ padding: 6 }}>
                        <Text style={[s.backArrow, { color: colors.burgundy }]}>←</Text>
                    </Pressable>
                    <Text style={[s.navTitle, { color: colors.ink }]} numberOfLines={1}>
                        {article.source}
                    </Text>
                    <Pressable
                        onPress={toggleLang}
                        hitSlop={8}
                        style={[s.langChip, { backgroundColor: colors.burgundyTint }]}
                    >
                        <Text style={{ fontSize: 13 }}>{isTrShown ? '🇬🇧' : '🇹🇷'}</Text>
                        <Text style={[s.langChipText, { color: colors.burgundy }]}>
                            {isTrShown ? 'English' : 'Türkçe'}
                        </Text>
                    </Pressable>
                </View>
            </View>

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
