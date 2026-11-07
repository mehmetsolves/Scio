import { memo, useCallback, useMemo, useState } from 'react'
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    RefreshControl,
    Alert,
    FlatList,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { MenuButton } from './HamburgerMenu'
import {
    filterNews,
    fetchBuiltinNews,
    formatNewsDate,
    getNewsSourceMeta,
    NEWS_SOURCES,
    NEWS_CACHE_KEY,
    FALLBACK_SOURCE_META,
    type NewsArticle,
    type NewsSource,
} from '../api/news'
import { useCachedResource } from '../api/cache'
import { useDownloads } from '../store/DownloadsContext'
import { useSettings } from '../store/SettingsContext'
import { useCustomSources } from '../store/CustomSourcesContext'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import SearchBar from '../components/SearchBar'
import FilterChips, { type FilterOption } from '../components/FilterChips'
import { SkeletonList, EmptyState } from '../components/ListStates'
import type { ColorScheme } from '../theme/colors'

const SERIF_BOLD = 'SourceSerif4_700Bold'
const SERIF_SEMIBOLD = 'SourceSerif4_600SemiBold'
const SANS = 'Inter_400Regular'
const SANS_MEDIUM = 'Inter_500Medium'
const SANS_SEMIBOLD = 'Inter_600SemiBold'

const NEWS_RED = '#C62828'

// Sabit alt boşluk — içeriğin alt barda kesilmesini önler
const BOTTOM_SPACE = 28

// ─── Kart ────────────────────────────────────────────────────────────────────
// memo: arama kutusuna her yazışta tüm kartlar yeniden çizilmesin.

const NewsCard = memo(function NewsCard({
    article,
    srcMeta,
    colors,
    onOpenUrl,
}: {
    article: NewsArticle
    srcMeta?: NewsSource
    colors: ColorScheme
    onOpenUrl: (url: string, title: string) => void
}) {
    const { downloadArticle, isDownloaded } = useDownloads()
    const [downloading, setDownloading] = useState(false)
    const sourceColor = srcMeta?.color ?? FALLBACK_SOURCE_META.color
    const alreadySaved = isDownloaded(article.id)

    return (
        <Pressable
            onPress={() => onOpenUrl(article.link, article.title)}
            style={({ pressed }) => [
                s.card,
                { backgroundColor: pressed ? colors.pressedCard : colors.card, borderColor: colors.border },
            ]}
        >
            {/* Kaynak şeridi — kartın solunda kaynak rengi */}
            <View style={[s.accent, { backgroundColor: sourceColor }]} />

            <View style={s.cardInner}>
                <View style={s.cardHeader}>
                    <Text style={[s.sourceText, { color: sourceColor }]} numberOfLines={1}>
                        {srcMeta?.label ?? article.source}
                    </Text>
                    <Text style={[s.timeText, { color: colors.mutedLight }]}>{formatNewsDate(article.pubDate)}</Text>
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
                        <Text style={[s.categoryText, { color: colors.mutedLight }]} numberOfLines={1}>
                            {article.category}
                        </Text>
                    ) : (
                        <View />
                    )}

                    <Pressable
                        onPress={(e) => {
                            e.stopPropagation?.()
                            if (downloading || alreadySaved) return
                            setDownloading(true)
                            downloadArticle({
                                id: article.id,
                                source: article.source,
                                title: article.title,
                                description: article.description,
                                link: article.link,
                                imageUrl: article.imageUrl,
                            })
                                .catch((err) => Alert.alert('İndirilemedi', err.message || 'Bir hata oluştu.'))
                                .finally(() => setDownloading(false))
                        }}
                        hitSlop={10}
                        disabled={downloading}
                        accessibilityLabel={alreadySaved ? 'İndirildi' : downloading ? 'İndiriliyor' : 'Çevrimdışı için indir'}
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
})

// ─── Ekran ───────────────────────────────────────────────────────────────────

function NewsScreen({
    colors,
    onOpenUrl,
    onSearch,
    onOpenMenu,
}: {
    colors: ColorScheme
    onOpenUrl: (url: string, title: string) => void
    onSearch: (q: string, mode?: 'academic' | 'news') => void
    onOpenMenu: () => void
}) {
    const { selectedTopics } = useSettings()
    const { sourcesByCategory, articlesByCategory, syncSources } = useCustomSources()

    // Gömülü kaynaklar önbellekten gelir: sekmeye dönüşte 0 ms, süresi
    // geçmişse arka planda tazelenir. persist → soğuk açılışta da anında.
    const builtin = useCachedResource(NEWS_CACHE_KEY, fetchBuiltinNews, { persist: true })

    const [activeFilter, setActiveFilter] = useState<string>('all')
    const [query, setQuery] = useState('')
    const debouncedQuery = useDebouncedValue(query)
    const [pullRefreshing, setPullRefreshing] = useState(false)

    // Haber kategorisindeki özel kaynaklar (diğer kategoriler kendi sekmelerinde)
    const customNewsSources = useMemo(() => sourcesByCategory('news'), [sourcesByCategory])
    const allSources: NewsSource[] = useMemo(() => [...NEWS_SOURCES, ...customNewsSources], [customNewsSources])

    // Gömülü + özel kaynak makaleleri tek akış, yeniden eskiye
    const articles = useMemo(() => {
        const merged = [...(builtin.data ?? []), ...articlesByCategory('news')]
        const seen = new Set<string>()
        return merged
            .filter((a) => {
                if (seen.has(a.id)) return false
                seen.add(a.id)
                return true
            })
            .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    }, [builtin.data, articlesByCategory])

    const filterOptions: FilterOption[] = useMemo(
        () => [
            { id: 'all', label: 'Tümü' },
            ...allSources.map((src) => ({ id: src.id, label: src.label, color: src.color })),
        ],
        [allSources],
    )

    // Kaynak filtresi + debounce'lu metin araması. Arama artık ayrı bir
    // ekrana gidip tüm RSS'leri yeniden indirmiyor; eldeki listeyi süzüyor.
    const visible = useMemo(() => {
        const bySource = activeFilter === 'all' ? articles : articles.filter((a) => a.source === activeFilter)
        return filterNews(bySource, debouncedQuery, allSources)
    }, [articles, activeFilter, debouncedQuery, allSources])

    const searching = debouncedQuery.trim().length > 0
    const pendingDebounce = query.trim() !== debouncedQuery.trim()

    const refreshBuiltin = builtin.refresh
    const handleRefresh = useCallback(async () => {
        setPullRefreshing(true)
        try {
            await Promise.all([refreshBuiltin(), syncSources(customNewsSources.map((src) => src.id))])
        } finally {
            setPullRefreshing(false)
        }
    }, [refreshBuiltin, syncSources, customNewsSources])

    const renderItem = useCallback(
        ({ item }: { item: NewsArticle }) => (
            <NewsCard
                article={item}
                srcMeta={getNewsSourceMeta(item.source, allSources)}
                colors={colors}
                onOpenUrl={onOpenUrl}
            />
        ),
        [allSources, colors, onOpenUrl],
    )

    const header = (
        <View style={[s.header, { borderBottomColor: colors.border }]}>
            <View style={s.headerTop}>
                <View style={{ flex: 1 }}>
                    <Text style={[s.headerTitle, { color: colors.ink }]}>Gündem</Text>
                    <Text style={[s.headerSub, { color: colors.mutedLight }]}>Türkiye ve dünyadan son haberler</Text>
                </View>
                <MenuButton onPress={onOpenMenu} colors={colors} />
            </View>

            <SearchBar
                value={query}
                onChangeText={setQuery}
                placeholder="Haberlerde ara (başlık, özet, kaynak)..."
                accent={NEWS_RED}
                colors={colors}
                busy={pendingDebounce}
            />

            {/* İlgi alanları — onboarding'de seçilen konular; akademik arama açar */}
            {query.length === 0 && selectedTopics.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginTop: 12 }}
                    contentContainerStyle={{ paddingRight: 8 }}
                >
                    {selectedTopics.map((topic) => (
                        <Pressable
                            key={topic}
                            onPress={() => onSearch(topic, 'academic')}
                            accessibilityLabel={`${topic} konusunda akademik makale ara`}
                            accessibilityRole="button"
                            style={[s.topicChip, { borderColor: colors.inputBorder }]}
                        >
                            <Text style={[s.topicChipText, { color: colors.muted }]}>{topic}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            )}

            <FilterChips
                options={filterOptions}
                value={activeFilter}
                onChange={setActiveFilter}
                accent={NEWS_RED}
                colors={colors}
            />
        </View>
    )

    let body
    if (builtin.loading && articles.length === 0) {
        body = <SkeletonList colors={colors} />
    } else if (builtin.error && articles.length === 0) {
        body = (
            <EmptyState
                icon="cloud-offline-outline"
                title="Haberler yüklenemedi"
                subtitle={builtin.error}
                actionLabel="Tekrar dene"
                onAction={refreshBuiltin}
                accent={NEWS_RED}
                colors={colors}
            />
        )
    } else {
        body = (
            <FlatList
                data={visible}
                keyExtractor={(a) => a.id}
                renderItem={renderItem}
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: BOTTOM_SPACE }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={7}
                ListHeaderComponent={
                    <Text style={[s.resultCount, { color: colors.mutedLight }]}>
                        {searching
                            ? `"${debouncedQuery.trim()}" için ${visible.length} sonuç`
                            : `${visible.length} haber`}
                    </Text>
                }
                ListEmptyComponent={
                    searching ? (
                        <EmptyState
                            icon="search-outline"
                            title="Sonuç bulunamadı"
                            subtitle={`"${debouncedQuery.trim()}" ile eşleşen haber yok. Farklı bir kelime dene ya da kaynak filtresini "Tümü" yap.`}
                            actionLabel="Aramayı temizle"
                            onAction={() => setQuery('')}
                            accent={NEWS_RED}
                            colors={colors}
                        />
                    ) : (
                        <EmptyState
                            icon="newspaper-outline"
                            title="Haber bulunamadı"
                            subtitle="Başka bir kaynak seçmeyi dene."
                            accent={NEWS_RED}
                            colors={colors}
                        />
                    )
                }
                refreshControl={
                    <RefreshControl
                        refreshing={pullRefreshing}
                        onRefresh={handleRefresh}
                        colors={[NEWS_RED]}
                        tintColor={NEWS_RED}
                    />
                }
            />
        )
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.cream }}>
            {header}
            {body}
        </View>
    )
}

export default memo(NewsScreen)

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
