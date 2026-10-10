import { useState, useEffect } from 'react'
import {
    View,
    Text,
    TextInput,
    ScrollView,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { MenuButton } from './HamburgerMenu'
import {
    fetchAllNews,
    formatNewsDate,
    getNewsSourceMeta,
    NEWS_SOURCES,
    FALLBACK_SOURCE_META,
    type NewsArticle,
    type NewsSource,
    type NewsSourceId,
} from '../api/news'
import { useDownloads } from '../store/DownloadsContext'
import { useSettings } from '../store/SettingsContext'
import { useCustomSources } from '../store/CustomSourcesContext'
import type { ColorScheme } from '../theme/colors'

const SERIF_BOLD = 'SourceSerif4_700Bold'
const SERIF_SEMIBOLD = 'SourceSerif4_600SemiBold'
const SANS = 'Inter_400Regular'
const SANS_MEDIUM = 'Inter_500Medium'
const SANS_SEMIBOLD = 'Inter_600SemiBold'

const NEWS_RED = '#C62828'

// Sabit alt boşluk — içeriğin alt barda kesilmesini önler
const BOTTOM_SPACE = 28

export default function NewsScreen({
    colors,
    onOpenUrl,
    onSearch,
    onOpenMenu,
}: {
    colors: ColorScheme
    onOpenUrl: (url: string, title: string) => void
    onSearch: (q: string) => void
    onOpenMenu: () => void
}) {
    const [articles, setArticles] = useState<NewsArticle[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [activeFilter, setActiveFilter] = useState<'all' | NewsSourceId>('all')
    const [focused, setFocused] = useState(false)
    const [query, setQuery] = useState('')
    const { downloadArticle, isDownloaded } = useDownloads()
    const { selectedTopics } = useSettings()
    const { customSources } = useCustomSources()
    const [downloadingId, setDownloadingId] = useState<string | null>(null)

    // Haber filtresi: kullanıcının eklediği özel kaynaklar + gömülü kaynaklar.
    // Arama sonuçları, detay göstergeler ve rozetler bu birleşik listeden gelir.
    const allSources: NewsSource[] = [...NEWS_SOURCES, ...customSources]

    useEffect(() => {
        loadNews()
    }, [])

    const loadNews = () => {
        setLoading(true)
        setError(null)
        fetchAllNews()
            .then(setArticles)
            .catch((err) => setError(err.message || 'Haberler yüklenemedi'))
            .finally(() => {
                setLoading(false)
                setRefreshing(false)
            })
    }

    const handleRefresh = () => {
        setRefreshing(true)
        loadNews()
    }

    const submitSearch = () => {
        const q = query.trim()
        if (q) onSearch(q)
    }

    const filteredArticles = activeFilter === 'all'
        ? articles
        : articles.filter((a) => a.source === activeFilter)

    return (
        <View style={{ flex: 1, backgroundColor: colors.cream }}>
            {/* ── Header ── */}
            <View style={[s.header, { borderBottomColor: colors.border }]}>
                <View style={s.headerTop}>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.headerTitle, { color: colors.ink }]}>Gündem</Text>
                        <Text style={[s.headerSub, { color: colors.mutedLight }]}>
                            Türkiye ve dünyadan son haberler
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {onOpenMenu && <MenuButton onPress={onOpenMenu} colors={colors} />}
                    </View>
                </View>

                {/* Arama — Gündem sekmesinden erişilebilir */}
                <View
                    style={[
                        s.searchBox,
                        {
                            borderColor: focused ? NEWS_RED : colors.inputBorder,
                            backgroundColor: colors.card,
                        },
                    ]}
                >
                    <Ionicons
                        name="search-outline"
                        size={17}
                        color={focused ? NEWS_RED : colors.mutedLight}
                        style={{ marginRight: 8 }}
                    />
                    <TextInput
                        value={query}
                        onChangeText={setQuery}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        onSubmitEditing={submitSearch}
                        returnKeyType="search"
                        placeholder="Akademik makale ara..."
                        placeholderTextColor={colors.mutedLight}
                        style={[s.searchInput, { color: colors.ink }]}
                    />
                    {query.length > 0 && (
                        <Pressable
                            onPress={() => setQuery('')}
                            hitSlop={8}
                            accessibilityLabel="Aramayı temizle"
                            accessibilityRole="button"
                        >
                            <Ionicons name="close-circle" size={17} color={colors.mutedLight} />
                        </Pressable>
                    )}
                </View>

                {/* İlgi alanları — onboarding'de seçilen konular. Boşsa hiç
                    gösterilmez; seçim varsa tek dokunuşla o konuyu arar. */}
                {selectedTopics.length > 0 && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginTop: 12 }}
                        contentContainerStyle={{ paddingRight: 8 }}
                    >
                        {selectedTopics.map((topic) => (
                            <Pressable
                                key={topic}
                                onPress={() => onSearch(topic)}
                                accessibilityLabel={`${topic} konusunda ara`}
                                accessibilityRole="button"
                                style={[s.topicChip, { borderColor: colors.inputBorder }]}
                            >
                                <Text style={[s.topicChipText, { color: colors.muted }]}>{topic}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                )}

                {/* Kaynak filtresi */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginTop: 12 }}
                    contentContainerStyle={{ paddingRight: 8 }}
                >
                    <Pressable
                        onPress={() => setActiveFilter('all')}
                        style={[
                            s.filterChip,
                            activeFilter === 'all'
                                ? { backgroundColor: NEWS_RED, borderColor: NEWS_RED }
                                : { backgroundColor: 'transparent', borderColor: colors.inputBorder },
                        ]}
                    >
                        <Text style={[s.filterChipText, { color: activeFilter === 'all' ? '#FFF' : colors.muted }]}>
                            Tümü
                        </Text>
                    </Pressable>
                    {NEWS_SOURCES.map((src) => {
                        const isActive = activeFilter === src.id
                        return (
                            <Pressable
                                key={src.id}
                                onPress={() => setActiveFilter(src.id)}
                                style={[
                                    s.filterChip,
                                    isActive
                                        ? { backgroundColor: src.color, borderColor: src.color }
                                        : { backgroundColor: 'transparent', borderColor: colors.inputBorder },
                                ]}
                            >
                                <Text style={[s.filterChipText, { color: isActive ? '#FFF' : colors.muted }]}>
                                    {src.label}
                                </Text>
                            </Pressable>
                        )
                    })}
                </ScrollView>
            </View>

            {/* ── İçerik ── */}
            {loading && !refreshing ? (
                <View style={s.centerBox}>
                    <ActivityIndicator size="large" color={NEWS_RED} />
                    <Text style={[s.statusText, { color: colors.muted }]}>Haberler yükleniyor...</Text>
                </View>
            ) : error ? (
                <View style={s.centerBox}>
                    <Ionicons name="cloud-offline-outline" size={36} color={colors.mutedLight} />
                    <Text style={[s.statusText, { color: colors.ink }]}>Haberler yüklenemedi</Text>
                    <Text style={[s.statusSubText, { color: colors.muted }]}>{error}</Text>
                    <Pressable onPress={loadNews} style={[s.retryBtn, { backgroundColor: NEWS_RED }]}>
                        <Text style={s.retryBtnText}>Tekrar dene</Text>
                    </Pressable>
                </View>
            ) : (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16, paddingBottom: BOTTOM_SPACE }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[NEWS_RED]}
                            tintColor={NEWS_RED}
                        />
                    }
                >
                    <Text style={[s.resultCount, { color: colors.mutedLight }]}>
                        {filteredArticles.length === 1 ? '1 haber' : `${filteredArticles.length} haber`}
                    </Text>

                    {filteredArticles.map((article) => {
                        // Kullanıcının eklediği özel kaynaklarda varsayılan
                        // metaya düşüş gerekir; getNewsSourceMeta artık
                        // bilinmeyen id için undefined döndürüyor.
                        const srcMeta = getNewsSourceMeta(article.source, allSources)
                        const sourceColor = srcMeta?.color ?? FALLBACK_SOURCE_META.color
                        const alreadySaved = isDownloaded(article.id)
                        const downloading = downloadingId === article.id
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
                                {/* Kaynak şeridi — kartın solunda kaynak rengi */}
                                <View style={[s.accent, { backgroundColor: sourceColor }]} />

                                <View style={s.cardInner}>
                                    <View style={s.cardHeader}>
                                        <Text style={[s.sourceText, { color: sourceColor }]}>
                                            {srcMeta?.label ?? article.source}
                                        </Text>
                                        <Text style={[s.timeText, { color: colors.mutedLight }]}>
                                            {formatNewsDate(article.pubDate)}
                                        </Text>
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
                                        {article.category ? (
                                            <Text style={[s.categoryText, { color: colors.mutedLight }]}>
                                                {article.category}
                                            </Text>
                                        ) : <View />}

                                        <Pressable
                                            onPress={(e) => {
                                                e.stopPropagation?.()
                                                if (downloading || alreadySaved) return
                                                setDownloadingId(article.id)
                                                downloadArticle({
                                                    id: article.id,
                                                    source: article.source,
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
                                            accessibilityLabel={
                                                alreadySaved ? 'İndirildi' : downloading ? 'İndiriliyor' : 'Çevrimdışı için indir'
                                            }
                                            accessibilityRole="button"
                                            style={s.saveBtn}
                                        >
                                            <Ionicons
                                                name={alreadySaved ? 'checkmark-circle' : downloading ? 'ellipsis-horizontal' : 'download-outline'}
                                                size={17}
                                                color={alreadySaved ? NEWS_RED : downloading ? colors.mutedLight : colors.muted}
                                            />
                                        </Pressable>
                                    </View>
                                </View>
                            </Pressable>
                        )
                    })}

                    {filteredArticles.length === 0 && (
                        <View style={s.emptyBox}>
                            <Ionicons name="newspaper-outline" size={34} color={colors.mutedLight} />
                            <Text style={[s.statusText, { color: colors.ink }]}>Haber bulunamadı</Text>
                            <Text style={[s.statusSubText, { color: colors.muted }]}>
                                Başka bir kaynak seçmeyi dene.
                            </Text>
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
    headerTitle: {
        fontFamily: SERIF_BOLD,
        fontSize: 26,
        lineHeight: 32,
    },
    headerSub: {
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
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 10,
        paddingHorizontal: 12,
        marginTop: 14,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 11,
        fontFamily: SANS,
        fontSize: 14,
    },
    filterChip: {
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 13,
        paddingVertical: 6,
        marginRight: 8,
    },
    topicChip: {
        borderWidth: 1,
        borderRadius: 14,
        borderStyle: 'dashed',
        paddingHorizontal: 11,
        paddingVertical: 5,
        marginRight: 8,
    },
    topicChipText: {
        fontFamily: SANS_MEDIUM,
        fontSize: 12,
    },
    filterChipText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 12,
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
    resultCount: {
        fontFamily: SANS,
        fontSize: 11,
        marginBottom: 10,
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
    sourceText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 10,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    timeText: {
        fontFamily: SANS,
        fontSize: 11,
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
        minHeight: 22,
    },
    categoryText: {
        fontFamily: SANS_MEDIUM,
        fontSize: 11,
    },
    saveBtn: {
        padding: 2,
    },
    emptyBox: {
        alignItems: 'center',
        padding: 40,
        gap: 8,
    },
})
