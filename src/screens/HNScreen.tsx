import { memo, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
    View,
    Text,
    Pressable,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { MenuButton } from './HamburgerMenu'
import type { ColorScheme } from '../theme/colors'
import { useDownloads } from '../store/DownloadsContext'
import { useCustomSources } from '../store/CustomSourcesContext'
import { filterNews, formatNewsDate, type NewsArticle } from '../api/news'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import SearchBar from '../components/SearchBar'
import { EmptyState } from '../components/ListStates'
import {
    fetchStoryIds,
    fetchItems,
    fetchItemsProgressive,
    extractDomain,
    timeAgo,
    filterByDate,
    filterHN,
    type HNItem,
    type HNFeed,
    type DateFilter,
} from '../api/hn'

// ─── Font constants ──────────────────────────────────────────────────────────

const SERIF = 'SourceSerif4_400Regular'
const SERIF_SEMIBOLD = 'SourceSerif4_600SemiBold'
const SERIF_BOLD = 'SourceSerif4_700Bold'
const SANS = 'Inter_400Regular'
const SANS_MEDIUM = 'Inter_500Medium'
const SANS_SEMIBOLD = 'Inter_600SemiBold'

const HN_ORANGE = '#E65100'

// İlk parti küçük tutuluyor: ölçüm 15 öğenin ~200 ms, 30 öğenin ~1 sn
// sürdüğünü gösterdi ve ekrana zaten ~4-5 kart sığıyor. Kalan öğeler ilk
// boyamadan sonra arka planda partiler hâlinde ekleniyor.
const FIRST_BATCH = 15
const NEXT_BATCH = 10

// Akış önbelleği (stale-while-revalidate). Sekmeye dönüşte liste anında
// görünür; 5 dakikadan eskiyse arka planda sessizce tazelenir.
const HN_TTL = 5 * 60 * 1000
const hnCache = new Map<HNFeed, { items: HNItem[]; time: number }>()

// "Kaynaklarım": Teknoloji kategorisinde eklenmiş özel kaynaklar
type FeedKey = HNFeed | 'custom'

// ─── Date Filter Labels ─────────────────────────────────────────────────────

const DATE_LABELS: { key: DateFilter; label: string }[] = [
    { key: 'all', label: 'Tümü' },
    { key: 'today', label: 'Bugün' },
    { key: 'week', label: 'Bu Hafta' },
    { key: 'month', label: 'Bu Ay' },
]

// ─── Skeleton Card ───────────────────────────────────────────────────────────

function SkeletonCard({ colors }: { colors: ColorScheme }) {
    return (
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={s.cardRow}>
                <View style={{ width: 22, alignItems: 'flex-end', paddingTop: 3 }}>
                    <View style={[s.skeleton, { width: 16, height: 14, backgroundColor: colors.inputBorder }]} />
                </View>
                <View style={{ flex: 1, gap: 8 }}>
                    <View style={[s.skeleton, { width: '90%', height: 16, backgroundColor: colors.inputBorder }]} />
                    <View style={[s.skeleton, { width: '60%', height: 12, backgroundColor: colors.inputBorder }]} />
                    <View style={[s.skeleton, { width: '40%', height: 10, backgroundColor: colors.inputBorder }]} />
                </View>
            </View>
        </View>
    )
}

// ─── HN Story Card ──────────────────────────────────────────────────────────

function HNCard({
    item,
    rank,
    onPress,
    colors,
}: {
    item: HNItem
    rank: number
    onPress: () => void
    colors: ColorScheme
}) {
    const [pressed, setPressed] = useState(false)
    const domain = extractDomain(item.url)
    const { downloadArticle, isDownloaded } = useDownloads()
    const [downloading, setDownloading] = useState(false)
    const dlId = `hn-${item.id}`
    const canDownload = !!item.url

    return (
        <Pressable
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            onPress={onPress}
            style={[
                s.card,
                {
                    backgroundColor: pressed ? colors.pressedCard : colors.card,
                    borderColor: colors.border,
                },
            ]}
        >
            <View style={s.cardRow}>
                <Text style={[s.rankNum, { color: colors.mutedLight }]}>{rank}</Text>
                <View style={{ flex: 1 }}>
                    <Text style={[s.cardTitle, { color: colors.ink }]}>{item.title}</Text>

                    <View style={s.metaRow}>
                        <Text style={[s.metaDomain, { color: colors.muted }]} numberOfLines={1}>
                            {domain}
                        </Text>
                        <Text style={[s.metaSep, { color: colors.inputBorder }]}>·</Text>
                        <Text style={[s.metaText, { color: colors.mutedLight }]}>{timeAgo(item.time)}</Text>
                    </View>

                    <View style={s.statRow}>
                        <View style={s.stat}>
                            <Ionicons name="caret-up" size={12} color={HN_ORANGE} />
                            <Text style={[s.statText, { color: HN_ORANGE }]}>{item.score}</Text>
                        </View>
                        <View style={s.stat}>
                            <Ionicons name="chatbubble-outline" size={12} color={colors.mutedLight} />
                            <Text style={[s.statText, { color: colors.mutedLight }]}>{item.descendants ?? 0}</Text>
                        </View>
                        <View style={s.stat}>
                            <Ionicons name="person-outline" size={12} color={colors.mutedLight} />
                            <Text style={[s.statText, { color: colors.mutedLight }]} numberOfLines={1}>
                                {item.by}
                            </Text>
                        </View>

                        {canDownload && (
                            <Pressable
                                onPress={(e) => {
                                    e.stopPropagation?.()
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
                                hitSlop={10}
                                accessibilityLabel={
                                    isDownloaded(dlId)
                                        ? 'İndirildi'
                                        : downloading
                                            ? 'İndiriliyor'
                                            : 'Çevrimdışı için indir'
                                }
                                accessibilityRole="button"
                                style={s.dlBtn}
                            >
                                <Ionicons
                                    name={isDownloaded(dlId) ? 'checkmark-circle' : downloading ? 'ellipsis-horizontal' : 'download-outline'}
                                    size={16}
                                    color={isDownloaded(dlId) ? HN_ORANGE : colors.muted}
                                />
                            </Pressable>
                        )}
                    </View>
                </View>
            </View>
        </Pressable>
    )
}

// ─── Main HN Screen ─────────────────────────────────────────────────────────

function HNScreen({
    colors,
    onItem,
    onOpenMenu,
    onOpenUrl,
}: {
    colors: ColorScheme
    onItem: (item: HNItem) => void
    onOpenMenu?: () => void
    onOpenUrl?: (url: string, title: string) => void
}) {
    const [feed, setFeed] = useState<FeedKey>('top')
    const { sourcesByCategory, articlesByCategory, syncSources } = useCustomSources()
    const techSources = useMemo(() => sourcesByCategory('tech'), [sourcesByCategory])
    const techArticles = useMemo(() => articlesByCategory('tech'), [articlesByCategory])
    const [dateFilter, setDateFilter] = useState<DateFilter>('all')
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [allIds, setAllIds] = useState<number[]>([])
    const [items, setItems] = useState<HNItem[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const debouncedQuery = useDebouncedValue(searchQuery)
    const itemsRef = useRef<HNItem[]>([])
    itemsRef.current = items

    // Ardışık append'ler aynı öğeyi tekrar ekleyebiliyordu (React'a
    // "Encountered two children with the same key" hatası bastıran sebepti).
    // HN item id'leri zorunlu olarak benzersiz olduğundan, liste tek merkezden
    // dedup'lanarak büyütülüyor.
    const appendItems = useCallback((incoming: HNItem[]) => {
        setItems((prev) => {
            if (incoming.length === 0) return prev
            const seen = new Set(prev.map((it) => it.id))
            const fresh = incoming.filter((it) => {
                if (seen.has(it.id)) return false
                seen.add(it.id)
                return true
            })
            return fresh.length === 0 ? prev : [...prev, ...fresh]
        })
    }, [])

    const loadFeed = useCallback(async (selectedFeed: HNFeed, isRefresh = false) => {
        const cached = hnCache.get(selectedFeed)
        if (!isRefresh && cached) {
            // Önbellekteki listeyi hemen göster
            setItems(cached.items)
            setLoading(false)
            if (Date.now() - cached.time < HN_TTL) return
            // Eskimiş: arka planda tazele, kullanıcı listeyi görmeye devam etsin
            setRefreshing(true)
        } else if (isRefresh) setRefreshing(true)
        else setLoading(true)

        try {
            const ids = await fetchStoryIds(selectedFeed)
            setAllIds(ids)

            if (ids.length === 0) {
                setItems([])
                return
            }

            // İlk parti gelince loading'i kapat: kullanıcı ~200 ms'de içerik
            // görür. Önceki feed'in öğeleri tamamen temizlenir (feed
            // değişiminde eski öğeler sayfada kalıyordu).
            const first = await fetchItems(ids.slice(0, FIRST_BATCH))
            setItems([])
            appendItems(first)
            setLoading(false)

            const rest = ids.slice(FIRST_BATCH, FIRST_BATCH + 45)
            if (rest.length > 0) {
                await fetchItemsProgressive(rest, appendItems, NEXT_BATCH)
            }
            // Son durumu önbelleğe yaz (bir sonraki render'dan sonra güncel)
            setTimeout(() => hnCache.set(selectedFeed, { items: itemsRef.current, time: Date.now() }), 0)
        } catch {
            if (!hnCache.get(selectedFeed)) setItems([])
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [appendItems])

    useEffect(() => {
        if (feed !== 'custom') loadFeed(feed)
    }, [feed])

    const refreshCurrent = useCallback(() => {
        if (feed === 'custom') {
            setRefreshing(true)
            syncSources(techSources.map((src) => src.id)).finally(() => setRefreshing(false))
        } else {
            loadFeed(feed, true)
        }
    }, [feed, loadFeed, syncSources, techSources])

    // Özel teknoloji kaynakları — debounce'lu arama
    const customVisible = useMemo(
        () => (feed === 'custom' ? filterNews(techArticles, debouncedQuery, techSources) : []),
        [feed, techArticles, debouncedQuery, techSources],
    )
    const sourceLabel = useMemo(() => {
        const map = new Map(techSources.map((src) => [src.id, src.label]))
        return (id: string) => map.get(id) ?? id
    }, [techSources])

    // Açtıktan hemen sonra filtrelenecek Türkçe sorgular çok sonuç bulmayıp
    // görüneni boşaltabilir. Sorgu uzunluğuna göre aramayı yapmaya devam et.
    // id'ye göre tekilleştirme, React'ın "two children with the same key"
    // hatasını kalıcı olarak engeller: arka plandaki append'ler, feed/reload
    // çakışmaları veya iki kez çalışan yükleme aynı öğeyi listeye iki kez
    // sokabiliyordu.
    const displayItems = useMemo(() => {
        const seen = new Set<number>()
        return filterByDate(filterHN(items, debouncedQuery), dateFilter).filter((item) => {
            if (seen.has(item.id)) return false
            seen.add(item.id)
            return true
        })
    }, [items, debouncedQuery, dateFilter])

    const FEED_TABS: { key: FeedKey; label: string }[] = [
        { key: 'top', label: 'En İyi' },
        { key: 'new', label: 'Yeni' },
        { key: 'best', label: 'Seçkin' },
        ...(techSources.length > 0 ? [{ key: 'custom' as const, label: 'Kaynaklarım' }] : []),
    ]
    const searchingNow = debouncedQuery.trim().length > 0

    const dateLabel = DATE_LABELS.find((d) => d.key === dateFilter)?.label ?? 'Tümü'

    return (
        <View style={{ flex: 1, backgroundColor: colors.cream }}>
            {/* Header */}
            <View style={s.header}>
                <View>
                    <Text style={[s.headerBrand, { color: HN_ORANGE }]}>HACKER NEWS</Text>
                    <Text style={[s.headerTitle, { color: colors.ink }]}>Teknoloji Akışı</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Pressable
                        onPress={() => setShowDatePicker(!showDatePicker)}
                        accessibilityLabel={`Tarih filtresi: ${dateLabel}`}
                        accessibilityRole="button"
                        style={[s.dateBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                    >
                        <Ionicons name="calendar-outline" size={13} color={colors.muted} />
                        <Text style={[s.dateBtnText, { color: colors.ink }]}>{dateLabel}</Text>
                        <Ionicons name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={12} color={colors.mutedLight} />
                    </Pressable>
                    <Pressable
                        onPress={refreshCurrent}
                        hitSlop={6}
                        accessibilityLabel="Akışı yenile"
                        accessibilityRole="button"
                        style={[s.refreshBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                    >
                        <Ionicons name="refresh" size={15} color={colors.muted} />
                    </Pressable>
                    {onOpenMenu && <MenuButton onPress={onOpenMenu} colors={colors} />}
                </View>
            </View>

            {/* Date Picker Dropdown */}
            {showDatePicker && (
                <View style={[s.datePicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {DATE_LABELS.map((d) => (
                        <Pressable
                            key={d.key}
                            onPress={() => {
                                setDateFilter(d.key)
                                setShowDatePicker(false)
                            }}
                            style={[
                                s.dateOption,
                                dateFilter === d.key && { backgroundColor: HN_ORANGE + '15' },
                            ]}
                        >
                            <Text
                                style={[
                                    s.dateOptionText,
                                    { color: dateFilter === d.key ? HN_ORANGE : colors.ink },
                                ]}
                            >
                                {d.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            )}

            {/* Feed Tabs */}
            <View style={[s.feedTabs, { borderBottomColor: colors.border }]}>
                {FEED_TABS.map((tab) => (
                    <Pressable
                        key={tab.key}
                        onPress={() => {
                            setFeed(tab.key)
                            setDateFilter('all')
                        }}
                        style={[
                            s.feedTab,
                            feed === tab.key && { borderBottomColor: HN_ORANGE, borderBottomWidth: 2 },
                        ]}
                    >
                        <Text
                            style={[
                                s.feedTabText,
                                { color: feed === tab.key ? HN_ORANGE : colors.muted },
                            ]}
                        >
                            {tab.label}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* Arama — yerel başlık/domain/yazar filtresi (HN API arama sunmuyor) */}
            <View style={{ paddingHorizontal: 16 }}>
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={feed === 'custom' ? 'Kaynaklarımda ara...' : 'Başlık, site veya yazar ara...'}
                    accent={HN_ORANGE}
                    colors={colors}
                    busy={searchQuery.trim() !== debouncedQuery.trim()}
                    style={{ marginTop: 10 }}
                />
            </View>

            {/* Content */}
            {feed === 'custom' ? (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={refreshCurrent} tintColor={HN_ORANGE} />
                    }
                >
                    {customVisible.length === 0 ? (
                        <EmptyState
                            icon="search-outline"
                            title={searchingNow ? 'Sonuç bulunamadı' : 'Bu kaynaklarda içerik yok'}
                            subtitle={searchingNow ? `"${debouncedQuery.trim()}" ile eşleşen içerik yok.` : 'Aşağı çekerek yenileyebilirsin.'}
                            actionLabel={searchingNow ? 'Aramayı temizle' : undefined}
                            onAction={searchingNow ? () => setSearchQuery('') : undefined}
                            accent={HN_ORANGE}
                            colors={colors}
                        />
                    ) : (
                        customVisible.map((a: NewsArticle) => (
                            <Pressable
                                key={a.id}
                                onPress={() => onOpenUrl?.(a.link, a.title)}
                                style={({ pressed }) => [
                                    s.card,
                                    { backgroundColor: pressed ? colors.pressedCard : colors.card, borderColor: colors.border },
                                ]}
                            >
                                <Text style={[s.metaDomain, { color: HN_ORANGE, marginBottom: 6 }]} numberOfLines={1}>
                                    {sourceLabel(a.source)} · {formatNewsDate(a.pubDate)}
                                </Text>
                                <Text style={[s.cardTitle, { color: colors.ink }]}>{a.title}</Text>
                                {a.description ? (
                                    <Text style={[s.metaText, { color: colors.mutedLight, marginTop: 6 }]} numberOfLines={2}>
                                        {a.description}
                                    </Text>
                                ) : null}
                            </Pressable>
                        ))
                    )}
                </ScrollView>
            ) : loading ? (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonCard key={i} colors={colors} />
                    ))}
                </ScrollView>
            ) : (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={refreshCurrent}
                            tintColor={HN_ORANGE}
                        />
                    }
                >
                    {displayItems.length === 0 ? (
                        <EmptyState
                            icon={searchingNow ? 'search-outline' : 'hourglass-outline'}
                            title="Sonuç bulunamadı"
                            subtitle={
                                searchingNow
                                    ? `"${debouncedQuery.trim()}" ile eşleşen haber yok. Tarih filtresini "Tümü" yapmayı dene.`
                                    : 'Bu filtre için sonuç bulunamadı.'
                            }
                            actionLabel={searchingNow ? 'Aramayı temizle' : undefined}
                            onAction={searchingNow ? () => setSearchQuery('') : undefined}
                            accent={HN_ORANGE}
                            colors={colors}
                        />
                    ) : (
                        displayItems.map((item, idx: number) => (
                            <HNCard
                                key={item.id}
                                item={item}
                                rank={idx + 1}
                                onPress={() => onItem(item)}
                                colors={colors}
                            />
                        ))
                    )}
                    <View style={{ height: 20 }} />
                </ScrollView>
            )}
        </View>
    )
}

export default memo(HNScreen)

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerBrand: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 11,
        letterSpacing: 1.5,
        marginBottom: 2,
    },
    headerTitle: {
        fontFamily: SERIF_BOLD,
        fontSize: 26,
    },
    dateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
    },
    dateBtnText: {
        fontFamily: SANS_MEDIUM,
        fontSize: 12,
    },
    refreshBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
    },
    datePicker: {
        position: 'absolute',
        top: 70,
        right: 16,
        zIndex: 100,
        borderWidth: 1,
        borderRadius: 10,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
    },
    dateOption: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    dateOptionText: {
        fontFamily: SANS_MEDIUM,
        fontSize: 13,
    },
    feedTabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        paddingHorizontal: 20,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 10,
        paddingHorizontal: 12,
        marginHorizontal: 16,
        marginTop: 10,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 9,
        fontFamily: SANS,
        fontSize: 13,
    },
    feedTab: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginRight: 4,
    },
    feedTabText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 13,
    },
    card: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
    },
    cardRow: {
        flexDirection: 'row',
        gap: 10,
    },
    rankNum: {
        fontFamily: SERIF_BOLD,
        fontSize: 17,
        width: 22,
        textAlign: 'right',
        opacity: 0.7,
        paddingTop: 1,
    },
    cardTitle: {
        fontFamily: SERIF_SEMIBOLD,
        fontSize: 15,
        lineHeight: 21,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    metaDomain: {
        fontFamily: SANS,
        fontSize: 11,
        flexShrink: 1,
    },
    metaSep: {
        fontSize: 11,
    },
    metaText: {
        fontFamily: SANS,
        fontSize: 11,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginTop: 8,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flexShrink: 1,
    },
    statText: {
        fontFamily: SANS_MEDIUM,
        fontSize: 11,
    },
    dlBtn: {
        marginLeft: 'auto',
        padding: 2,
    },
    skeleton: {
        borderRadius: 6,
    },
    emptyBox: {
        alignItems: 'center',
        paddingTop: 60,
        gap: 10,
    },
    emptyText: {
        fontFamily: SANS_MEDIUM,
        fontSize: 14,
    },
})
