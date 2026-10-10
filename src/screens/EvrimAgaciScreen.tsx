import { useState, useEffect } from 'react'
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useSavedArticles } from '../store/SavedArticlesContext'
import { useDownloads } from '../store/DownloadsContext'
import { fetchEvrimAgaciArticles, formatEvrimDate, type EvrimAgaciArticle } from '../api/evrimagaci'
import type { ColorScheme } from '../theme/colors'

const SERIF_BOLD = 'SourceSerif4_700Bold'
const SERIF_SEMIBOLD = 'SourceSerif4_600SemiBold'
const SANS = 'Inter_400Regular'
const SANS_MEDIUM = 'Inter_500Medium'
const SANS_SEMIBOLD = 'Inter_600SemiBold'

const EA_GREEN = '#2D8C3E'
const EA_GREEN_DARK = '#1B6B2A'

export default function EvrimAgaciScreen({
    colors,
    onOpenUrl,
}: {
    colors: ColorScheme
    onOpenUrl: (url: string, title: string) => void
}) {
    const { isEvrimSaved, toggleEvrimSave } = useSavedArticles()
    const { downloadArticle, isDownloaded } = useDownloads()
    const [downloadingId, setDownloadingId] = useState<string | null>(null)
    const [articles, setArticles] = useState<EvrimAgaciArticle[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadArticles()
    }, [])

    const loadArticles = (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        setError(null)
        fetchEvrimAgaciArticles()
            .then(setArticles)
            .catch((err) => setError(err.message || 'Makaleler yüklenemedi'))
            .finally(() => {
                setLoading(false)
                setRefreshing(false)
            })
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.cream }}>
            {/* ── Header ── */}
            <View style={[s.header, { borderBottomColor: colors.border }]}>
                <View style={s.headerTop}>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.headerBrand, { color: EA_GREEN }]}>EVRİM AĞACI</Text>
                        <Text style={[s.screenTitle, { color: colors.ink }]}>Bilim</Text>
                        <Text style={[s.screenSubtitle, { color: colors.mutedLight }]}>
                            Bilim, teknoloji ve doğa
                        </Text>
                    </View>
                    <Pressable
                        onPress={() => loadArticles(true)}
                        hitSlop={6}
                        style={[s.iconBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                    >
                        <Ionicons name="refresh" size={15} color={colors.muted} />
                    </Pressable>
                </View>
            </View>

            {/* ── İçerik ── */}
            {loading ? (
                <View style={s.centerBox}>
                    <ActivityIndicator size="large" color={EA_GREEN} />
                    <Text style={[s.statusText, { color: colors.muted }]}>Makaleler yükleniyor...</Text>
                </View>
            ) : error ? (
                <View style={s.centerBox}>
                    <Ionicons name="cloud-offline-outline" size={36} color={colors.mutedLight} />
                    <Text style={[s.statusText, { color: colors.ink }]}>Makaleler yüklenemedi</Text>
                    <Text style={[s.statusSubText, { color: colors.muted }]}>{error}</Text>
                    <Pressable onPress={() => loadArticles()} style={[s.retryBtn, { backgroundColor: EA_GREEN }]}>
                        <Text style={s.retryBtnText}>Tekrar dene</Text>
                    </Pressable>
                </View>
            ) : (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadArticles(true)}
                            colors={[EA_GREEN]}
                            tintColor={EA_GREEN}
                        />
                    }
                >
                    <View style={[s.infoBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Ionicons name="flask-outline" size={15} color={EA_GREEN} style={{ marginTop: 1 }} />
                        <Text style={[s.infoText, { color: colors.muted }]}>
                            Makaleye dokunarak oku. Tam erişim için Evrim Ağacı oturumu gerekebilir.
                        </Text>
                    </View>

                    {articles.map((article) => {
                        const downloading = downloadingId === article.id
                        const saved = isDownloaded(article.id)
                        const liked = isEvrimSaved(article.id)
                        return (
                            <Pressable
                                key={article.id}
                                onPress={() => onOpenUrl(article.link, article.title)}
                                style={({ pressed }) => [
                                    s.card,
                                    {
                                        backgroundColor: pressed ? colors.pressedCard : colors.card,
                                        borderColor: colors.border,
                                    },
                                ]}
                            >
                                <View style={[s.accent, { backgroundColor: EA_GREEN }]} />

                                <View style={s.cardInner}>
                                    <View style={s.cardHeader}>
                                        <Text style={[s.categoryText, { color: EA_GREEN_DARK }]}>
                                            {article.category}
                                        </Text>
                                        <View style={s.actions}>
                                            <Pressable
                                                onPress={(e) => {
                                                    e.stopPropagation?.()
                                                    if (downloading || saved) return
                                                    setDownloadingId(article.id)
                                                    downloadArticle({
                                                        id: article.id,
                                                        source: 'evrimagaci',
                                                        title: article.title,
                                                        description: article.description,
                                                        link: article.link,
                                                        imageUrl: article.imageUrl,
                                                    })
                                                        .catch((err) => Alert.alert('İndirilemedi', err.message || 'Bir hata oluştu.'))
                                                        .finally(() => setDownloadingId(null))
                                                }}
                                                hitSlop={10}
                                                disabled={downloading}
                                                style={s.actionBtn}
                                            >
                                                <Ionicons
                                                    name={saved ? 'checkmark-circle' : downloading ? 'ellipsis-horizontal' : 'download-outline'}
                                                    size={17}
                                                    color={saved ? EA_GREEN : downloading ? colors.mutedLight : colors.muted}
                                                />
                                            </Pressable>
                                            <Pressable
                                                onPress={(e) => {
                                                    e.stopPropagation?.()
                                                    toggleEvrimSave(article)
                                                }}
                                                hitSlop={10}
                                                style={s.actionBtn}
                                            >
                                                <Ionicons
                                                    name={liked ? 'heart' : 'heart-outline'}
                                                    size={17}
                                                    color={liked ? EA_GREEN : colors.muted}
                                                />
                                            </Pressable>
                                        </View>
                                    </View>

                                    <Text style={[s.cardTitle, { color: colors.ink }]} numberOfLines={3}>
                                        {article.title}
                                    </Text>

                                    {article.description ? (
                                        <Text style={[s.cardDesc, { color: colors.cardAbstract }]} numberOfLines={2}>
                                            {article.description}
                                        </Text>
                                    ) : null}

                                    <View style={s.cardFooter}>
                                        <View style={s.dateRow}>
                                            <Ionicons name="time-outline" size={12} color={colors.mutedLight} />
                                            <Text style={[s.dateText, { color: colors.mutedLight }]}>
                                                {formatEvrimDate(article.pubDate)}
                                            </Text>
                                        </View>
                                        <View style={s.readMore}>
                                            <Text style={[s.readMoreText, { color: EA_GREEN }]}>Oku</Text>
                                            <Ionicons name="chevron-forward" size={13} color={EA_GREEN} />
                                        </View>
                                    </View>
                                </View>
                            </Pressable>
                        )
                    })}

                    {articles.length === 0 && (
                        <View style={s.emptyBox}>
                            <Ionicons name="telescope-outline" size={34} color={colors.mutedLight} />
                            <Text style={[s.statusText, { color: colors.ink }]}>Makale bulunamadı</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    )
}

const s = StyleSheet.create({
    header: {
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
        borderBottomWidth: 1,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
    },
    headerBrand: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 11,
        letterSpacing: 1.5,
        marginBottom: 2,
    },
    screenTitle: {
        fontFamily: SERIF_BOLD,
        fontSize: 26,
        lineHeight: 32,
    },
    screenSubtitle: {
        fontFamily: SANS,
        fontSize: 12,
        marginTop: 2,
    },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        gap: 10,
    },
    statusText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 16,
        marginTop: 4,
        textAlign: 'center',
    },
    statusSubText: {
        fontFamily: SANS,
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },
    retryBtn: {
        marginTop: 12,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryBtnText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 13,
        color: '#FFFFFF',
    },
    infoBanner: {
        flexDirection: 'row',
        gap: 8,
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
    },
    infoText: {
        fontFamily: SANS,
        fontSize: 12,
        lineHeight: 18,
        flex: 1,
    },
    card: {
        flexDirection: 'row',
        borderWidth: 1,
        borderRadius: 12,
        marginBottom: 10,
        overflow: 'hidden',
    },
    accent: {
        width: 3,
    },
    cardInner: {
        flex: 1,
        padding: 14,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    categoryText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 10,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    actionBtn: {
        padding: 2,
    },
    cardTitle: {
        fontFamily: SERIF_SEMIBOLD,
        fontSize: 16,
        lineHeight: 23,
        marginBottom: 6,
    },
    cardDesc: {
        fontFamily: SANS,
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 10,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dateText: {
        fontFamily: SANS,
        fontSize: 11,
    },
    readMore: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    readMoreText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 12,
    },
    emptyBox: {
        alignItems: 'center',
        padding: 40,
        gap: 10,
    },
})
