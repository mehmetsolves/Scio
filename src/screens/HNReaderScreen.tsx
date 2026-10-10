import { useState } from 'react'
import {
    View,
    Text,
    Pressable,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Linking,
    Alert,
} from 'react-native'
import { WebView } from 'react-native-webview'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { ColorScheme } from '../theme/colors'
import { extractDomain, type HNItem } from '../api/hn'
import { useSavedArticles } from '../store/SavedArticlesContext'
import { useDownloads } from '../store/DownloadsContext'

// ─── Font constants ──────────────────────────────────────────────────────────

const SERIF = 'SourceSerif4_400Regular'
const SERIF_BOLD = 'SourceSerif4_700Bold'
const SANS = 'Inter_400Regular'
const SANS_MEDIUM = 'Inter_500Medium'
const SANS_SEMIBOLD = 'Inter_600SemiBold'

const HN_ORANGE = '#E65100'

// ─── Helper ──────────────────────────────────────────────────────────────────

function stripTags(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
        .trim()
}

function getTranslateUrl(url: string): string {
    return `https://translate.google.com/translate?sl=auto&tl=tr&u=${encodeURIComponent(url)}`
}

// ─── Main Reader Screen ─────────────────────────────────────────────────────

export default function HNReaderScreen({
    item,
    onBack,
    colors,
}: {
    item: HNItem
    onBack: () => void
    colors: ColorScheme
}) {
    const { isHNSaved, toggleHNSave } = useSavedArticles()
    const { downloadArticle, isDownloaded } = useDownloads()
    const [downloading, setDownloading] = useState(false)
    const [loading, setLoading] = useState(true)
    const [translated, setTranslated] = useState(false)
    const domain = extractDomain(item.url)
    const isTextPost = !item.url && item.text
    const dlId = `hn-${item.id}`
    const canDownload = !!item.url

    const dateStr = new Date(item.time * 1000).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })

    const currentUrl = item.url
        ? (translated ? getTranslateUrl(item.url) : item.url)
        : null

    return (
        <View style={{ flex: 1, backgroundColor: colors.cream }}>
            {/* Nav Bar */}
            <View style={[s.navBar, { borderBottomColor: colors.border, backgroundColor: colors.cream }]}>
                <View style={s.navRow}>
                    <Pressable
                        onPress={onBack}
                        hitSlop={8}
                        accessibilityLabel="Geri"
                        accessibilityRole="button"
                        style={{ padding: 6 }}
                    >
                        <Text style={[s.backArrow, { color: HN_ORANGE }]}>←</Text>
                    </Pressable>
                    <View style={[s.hnBadge, { backgroundColor: HN_ORANGE }]}>
                        <Text style={s.hnBadgeText}>HN</Text>
                    </View>
                    <View style={{ flex: 1 }} />
                    <Text style={[s.domainLabel, { color: colors.muted }]} numberOfLines={1}>
                        {domain}
                    </Text>
                    {item.url && (
                        <Pressable
                            onPress={() => Linking.openURL(item.url!)}
                            hitSlop={8}
                            accessibilityLabel="Tarayıcıda aç"
                            accessibilityRole="link"
                            style={{ padding: 4 }}
                        >
                            <Text style={{ color: HN_ORANGE, fontSize: 14 }}>↗</Text>
                        </Pressable>
                    )}
                    {canDownload && (
                        <Pressable
                            onPress={() => {
                                if (downloading || isDownloaded(dlId)) return
                                setDownloading(true)
                                downloadArticle({
                                    id: dlId,
                                    source: 'hn',
                                    title: item.title,
                                    description: item.text ? item.text.replace(/<[^>]+>/g, '').trim() : '',
                                    link: item.url!,
                                })
                                    .catch((err) => Alert.alert('İndirilemedi', err.message || 'Bir hata oluştu.'))
                                    .finally(() => setDownloading(false))
                            }}
                            hitSlop={8}
                            accessibilityLabel={
                                isDownloaded(dlId) ? 'İndirildi' : downloading ? 'İndiriliyor' : 'Çevrimdışı için indir'
                            }
                            accessibilityRole="button"
                            style={{ marginLeft: 4, padding: 4 }}
                        >
                            <Ionicons
                                name={isDownloaded(dlId) ? 'checkmark-circle' : downloading ? 'ellipsis-horizontal' : 'download-outline'}
                                size={18}
                                color={downloading ? colors.mutedLight : HN_ORANGE}
                            />
                        </Pressable>
                    )}
                    <Pressable
                        onPress={() => toggleHNSave(item)}
                        hitSlop={8}
                        accessibilityLabel={isHNSaved(item.id) ? 'Kaydedildi, kaldır' : 'Kaydet'}
                        accessibilityRole="button"
                        style={{ marginLeft: 8, padding: 4 }}
                    >
                        <Ionicons
                            name={isHNSaved(item.id) ? 'bookmark' : 'bookmark-outline'}
                            size={18}
                            color={HN_ORANGE}
                        />
                    </Pressable>
                </View>
            </View>

            {/* Article Meta */}
            <View style={[s.metaBox, { borderBottomColor: colors.border }]}>
                <Text style={[s.articleTitle, { color: colors.ink }]}>{item.title}</Text>
                <View style={s.metaRow}>
                    <Ionicons name="caret-up" size={13} color={HN_ORANGE} />
                    <Text style={[s.metaText, { color: HN_ORANGE }]}>{item.score}</Text>
                    <Text style={[s.metaText, { color: colors.muted }]}>{item.by}</Text>
                    <Text style={[s.metaText, { color: colors.mutedLight }]}>{dateStr}</Text>
                    <Ionicons name="chatbubble-outline" size={12} color={colors.mutedLight} />
                    <Text style={[s.commentCount, { color: colors.muted }]}>
                        {item.descendants ?? 0} yorum
                    </Text>
                </View>
            </View>

            {/* Content */}
            {isTextPost ? (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={s.textBody}>
                    <Text style={[s.bodyText, { color: colors.ink }]}>
                        {stripTags(item.text!)}
                    </Text>
                </ScrollView>
            ) : currentUrl ? (
                <View style={{ flex: 1 }}>
                    {loading && (
                        <View style={s.loadingOverlay}>
                            <ActivityIndicator size="large" color={HN_ORANGE} />
                            <Text style={[s.loadingText, { color: colors.muted }]}>Makale yükleniyor...</Text>
                        </View>
                    )}
                    <WebView
                        key={currentUrl}
                        source={{ uri: currentUrl }}
                        style={{ flex: 1 }}
                        onLoadEnd={() => setLoading(false)}
                        onLoadStart={() => setLoading(true)}
                        startInLoadingState={false}
                        javaScriptEnabled
                        domStorageEnabled
                    />
                </View>
            ) : (
                <View style={s.centerBox}>
                    <Ionicons name="document-outline" size={32} color={colors.mutedLight} style={{ marginBottom: 12 }} />
                    <Text style={[s.errorTitle, { color: colors.ink }]}>İçerik bulunamadı</Text>
                </View>
            )}

            {/* Language Toggle FAB */}
            {(item.url || isTextPost) && (
                <Pressable
                    onPress={() => {
                        setTranslated((v) => !v)
                        if (item.url) setLoading(true)
                    }}
                    accessibilityLabel={translated ? 'Orijinal dili göster' : 'Türkçeye çevir'}
                    accessibilityRole="button"
                    style={s.langToggle}
                >
                    <Text style={{ fontSize: 14 }}>{translated ? '🇬🇧' : '🇹🇷'}</Text>
                    <Text style={s.langToggleText}>{translated ? 'Orijinal' : 'Türkçe'}</Text>
                </Pressable>
            )}
        </View>
    )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    navBar: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    backArrow: { fontSize: 18 },
    hnBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    hnBadgeText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 10,
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    domainLabel: {
        fontFamily: SANS,
        fontSize: 12,
        maxWidth: 160,
    },
    metaBox: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    articleTitle: {
        fontFamily: SERIF_BOLD,
        fontSize: 20,
        lineHeight: 28,
        marginBottom: 8,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 4,
    },
    metaText: {
        fontFamily: SANS,
        fontSize: 12,
    },
    commentCount: {
        fontFamily: SANS,
        fontSize: 12,
    },
    centerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        alignItems: 'center',
        paddingTop: 60,
    },
    loadingText: {
        fontFamily: SANS_MEDIUM,
        fontSize: 14,
        marginTop: 12,
    },
    errorTitle: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 16,
        marginBottom: 6,
    },
    textBody: {
        padding: 20,
    },
    bodyText: {
        fontFamily: SERIF,
        fontSize: 15,
        lineHeight: 27,
        textAlign: 'justify',
    },
    langToggle: {
        position: 'absolute',
        right: 20,
        bottom: 24,
        backgroundColor: '#1A1A1A',
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 9,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
    },
    langToggleText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 12,
        color: '#FAF7F2',
        letterSpacing: 0.4,
    },
})
