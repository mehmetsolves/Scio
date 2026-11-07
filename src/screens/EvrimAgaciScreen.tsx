import { memo, useCallback, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet, RefreshControl, Alert, FlatList } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { MenuButton } from './HamburgerMenu'
import { useSavedArticles } from '../store/SavedArticlesContext'
import { useDownloads } from '../store/DownloadsContext'
import { useCustomSources } from '../store/CustomSourcesContext'
import {
    fetchEvrimAgaciArticles,
    filterEvrim,
    formatEvrimDate,
    EVRIM_CACHE_KEY,
    type EvrimAgaciArticle,
} from '../api/evrimagaci'
import { useCachedResource } from '../api/cache'
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

const EA_GREEN = '#2D8C3E'
const EA_GREEN_DARK = '#1B6B2A'

// Evrim Ağacı makalesi ya da "Bilim" kategorisinde eklenmiş özel kaynak
// makalesi. Özel kaynaklarda `sourceId` dolu; kaydet (kalp) yalnızca Evrim
// Ağacı için var çünkü Kayıtlılar'da "Evrim Ağacı" rozetiyle listeleniyor.
interface ScienceItem extends EvrimAgaciArticle {
    sourceId?: string
}

const ScienceCard = memo(function ScienceCard({
    article,
    colors,
    onOpenUrl,
}: {
    article: ScienceItem
    colors: ColorScheme
    onOpenUrl: (url: string, title: string) => void
}) {
    const { isEvrimSaved, toggleEvrimSave } = useSavedArticles()
    const { downloadArticle, isDownloaded } = useDownloads()
    const [downloading, setDownloading] = useState(false)
    const saved = isDownloaded(article.id)
    const isEvrim = !article.sourceId
    const liked = isEvrim && isEvrimSaved(article.id)

    return (
        <Pressable
            onPress={() => onOpenUrl(article.link, article.title)}
            style={({ pressed }) => [
                s.card,
                { backgroundColor: pressed ? colors.pressedCard : colors.card, borderColor: colors.border },
            ]}
        >
            <View style={[s.accent, { backgroundColor: isEvrim ? EA_GREEN : colors.inputBorder }]} />

            <View style={s.cardInner}>
                <View style={s.cardHeader}>
                    <Text style={[s.categoryText, { color: EA_GREEN_DARK, flex: 1 }]} numberOfLines={1}>
                        {article.category}
                    </Text>
                    <View style={s.actions}>
                        <Pressable
                            onPress={(e) => {
                                e.stopPropagation?.()
                                if (downloading || saved) return
                                setDownloading(true)
                                downloadArticle({
                                    id: article.id,
                                    source: article.sourceId ?? 'evrimagaci',
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
                            accessibilityLabel={saved ? 'İndirildi' : downloading ? 'İndiriliyor' : 'Çevrimdışı için indir'}
                            accessibilityRole="button"
                            style={s.actionBtn}
                        >
                            <Ionicons
                                name={saved ? 'checkmark-circle' : downloading ? 'ellipsis-horizontal' : 'download-outline'}
                                size={17}
                                color={saved ? EA_GREEN : downloading ? colors.mutedLight : colors.muted}
                            />
                        </Pressable>
                        {isEvrim && (
                            <Pressable
                                onPress={(e) => {
                                    e.stopPropagation?.()
                                    toggleEvrimSave(article)
                                }}
                                hitSlop={10}
                                accessibilityLabel={liked ? 'Kaydedildi, kaldır' : 'Makaleyi kaydet'}
                                accessibilityRole="button"
                                style={s.actionBtn}
                            >
                                <Ionicons name={liked ? 'heart' : 'heart-outline'} size={17} color={liked ? EA_GREEN : colors.muted} />
                            </Pressable>
                        )}
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
                        <Text style={[s.dateText, { color: colors.mutedLight }]}>{formatEvrimDate(article.pubDate)}</Text>
                    </View>
                    <View style={s.readMore}>
                        <Text style={[s.readMoreText, { color: EA_GREEN }]}>Oku</Text>
                        <Ionicons name="chevron-forward" size={13} color={EA_GREEN} />
                    </View>
                </View>
            </View>
        </Pressable>
    )
})

function EvrimAgaciScreen({
    colors,
    onOpenUrl,
    onOpenMenu,
}: {
    colors: ColorScheme
    onOpenUrl: (url: string, title: string) => void
    onOpenMenu?: () => void
}) {
    const feed = useCachedResource(EVRIM_CACHE_KEY, fetchEvrimAgaciArticles, { persist: true })
    const { sourcesByCategory, articlesByCategory, syncSources } = useCustomSources()

    const [query, setQuery] = useState('')
    const debouncedQuery = useDebouncedValue(query)
    const [sourceFilter, setSourceFilter] = useState('all')
    const [pullRefreshing, setPullRefreshing] = useState(false)

    const scienceSources = useMemo(() => sourcesByCategory('science'), [sourcesByCategory])

    // Özel bilim kaynaklarının makaleleri aynı kart modeline çevrilir
    const customItems: ScienceItem[] = useMemo(() => {
        const labels = new Map(scienceSources.map((src) => [src.id, src.label]))
        return articlesByCategory('science').map((a) => ({
            id: a.id,
            title: a.title,
            description: a.description,
            link: a.link,
            pubDate: a.pubDate,
            category: labels.get(a.source) ?? a.category ?? 'Bilim',
            imageUrl: a.imageUrl,
            sourceId: a.source,
        }))
    }, [articlesByCategory, scienceSources])

    const filterOptions: FilterOption[] = useMemo(
        () =>
            scienceSources.length === 0
                ? []
                : [
                      { id: 'all', label: 'Tümü' },
                      { id: 'evrimagaci', label: 'Evrim Ağacı' },
                      ...scienceSources.map((src) => ({ id: src.id, label: src.label })),
                  ],
        [scienceSources],
    )

    const visible = useMemo(() => {
        const evrim: ScienceItem[] = feed.data ?? []
        let pool: ScienceItem[]
        if (sourceFilter === 'all') {
            pool = [...evrim, ...customItems].sort(
                (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
            )
        } else if (sourceFilter === 'evrimagaci') {
            pool = evrim
        } else {
            pool = customItems.filter((a) => a.sourceId === sourceFilter)
        }
        return filterEvrim(pool, debouncedQuery) as ScienceItem[]
    }, [feed.data, customItems, sourceFilter, debouncedQuery])

    const searching = debouncedQuery.trim().length > 0

    const refreshFeed = feed.refresh
    const handleRefresh = useCallback(async () => {
        setPullRefreshing(true)
        try {
            await Promise.all([refreshFeed(), syncSources(scienceSources.map((src) => src.id))])
        } finally {
            setPullRefreshing(false)
        }
    }, [refreshFeed, syncSources, scienceSources])

    const renderItem = useCallback(
        ({ item }: { item: ScienceItem }) => <ScienceCard article={item} colors={colors} onOpenUrl={onOpenUrl} />,
        [colors, onOpenUrl],
    )

    const hasData = (feed.data?.length ?? 0) + customItems.length > 0

    return (
        <View style={{ flex: 1, backgroundColor: colors.cream }}>
            {/* ── Header ── */}
            <View style={[s.header, { borderBottomColor: colors.border }]}>
                <View style={s.headerTop}>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.headerBrand, { color: EA_GREEN }]}>EVRİM AĞACI</Text>
                        <Text style={[s.screenTitle, { color: colors.ink }]}>Bilim</Text>
                        <Text style={[s.screenSubtitle, { color: colors.mutedLight }]}>Bilim, teknoloji ve doğa</Text>
                    </View>
                    <Pressable
                        onPress={handleRefresh}
                        hitSlop={6}
                        accessibilityLabel="Makaleleri yenile"
                        accessibilityRole="button"
                        style={[s.iconBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                    >
                        <Ionicons name="refresh" size={15} color={colors.muted} />
                    </Pressable>
                    {onOpenMenu && <MenuButton onPress={onOpenMenu} colors={colors} />}
                </View>

                <SearchBar
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Bilim makalelerinde ara..."
                    accent={EA_GREEN}
                    colors={colors}
                    busy={query.trim() !== debouncedQuery.trim()}
                />
                <FilterChips
                    options={filterOptions}
                    value={sourceFilter}
                    onChange={setSourceFilter}
                    accent={EA_GREEN}
                    colors={colors}
                />
            </View>

            {/* ── İçerik ── */}
            {feed.loading && !hasData ? (
                <SkeletonList colors={colors} />
            ) : feed.error && !hasData ? (
                <EmptyState
                    icon="cloud-offline-outline"
                    title="Makaleler yüklenemedi"
                    subtitle={feed.error}
                    actionLabel="Tekrar dene"
                    onAction={refreshFeed}
                    accent={EA_GREEN}
                    colors={colors}
                />
            ) : (
                <FlatList
                    data={visible}
                    keyExtractor={(a) => a.id}
                    renderItem={renderItem}
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    initialNumToRender={8}
                    maxToRenderPerBatch={8}
                    windowSize={7}
                    ListHeaderComponent={
                        searching ? (
                            <Text style={[s.dateText, { color: colors.mutedLight, marginBottom: 10 }]}>
                                "{debouncedQuery.trim()}" için {visible.length} sonuç
                            </Text>
                        ) : (
                            <View style={[s.infoBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Ionicons name="flask-outline" size={15} color={EA_GREEN} style={{ marginTop: 1 }} />
                                <Text style={[s.infoText, { color: colors.muted }]}>
                                    Makaleye dokunarak oku. Tam erişim için Evrim Ağacı oturumu gerekebilir.
                                </Text>
                            </View>
                        )
                    }
                    ListEmptyComponent={
                        searching ? (
                            <EmptyState
                                icon="search-outline"
                                title="Sonuç bulunamadı"
                                subtitle={`"${debouncedQuery.trim()}" ile eşleşen makale yok.`}
                                actionLabel="Aramayı temizle"
                                onAction={() => setQuery('')}
                                accent={EA_GREEN}
                                colors={colors}
                            />
                        ) : (
                            <EmptyState icon="telescope-outline" title="Makale bulunamadı" accent={EA_GREEN} colors={colors} />
                        )
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={pullRefreshing}
                            onRefresh={handleRefresh}
                            colors={[EA_GREEN]}
                            tintColor={EA_GREEN}
                        />
                    }
                />
            )}
        </View>
    )
}

export default memo(EvrimAgaciScreen)

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
