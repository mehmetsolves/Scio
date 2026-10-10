import { useState, useEffect, useCallback } from 'react'
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
import {
    fetchStoryIds,
    fetchItems,
    extractDomain,
    timeAgo,
    filterByDate,
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
const PAGE_SIZE = 30

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

export default function HNScreen({
    colors,
    onItem,
    onOpenMenu,
}: {
    colors: ColorScheme
    onItem: (item: HNItem) => void
    onOpenMenu?: () => void
}) {
    const [feed, setFeed] = useState<HNFeed>('top')
    const [dateFilter, setDateFilter] = useState<DateFilter>('all')
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [allIds, setAllIds] = useState<number[]>([])
    const [items, setItems] = useState<HNItem[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const loadFeed = useCallback(async (selectedFeed: HNFeed, isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        
        try {
            const ids = await fetchStoryIds(selectedFeed)
            setAllIds(ids)
            const batch = await fetchItems(ids.slice(0, PAGE_SIZE))
            setItems(batch)
        } catch {
            setItems([])
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        loadFeed(feed)
    }, [feed])

    const displayItems = filterByDate(items, dateFilter)

    const FEED_TABS: { key: HNFeed; label: string }[] = [
        { key: 'top', label: 'En İyi' },
        { key: 'new', label: 'Yeni' },
        { key: 'best', label: 'Seçkin' },
    ]

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
                        onPress={() => loadFeed(feed, true)}
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

            {/* Content */}
            {loading ? (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonCard key={i} colors={colors} />
                    ))}
                </ScrollView>
            ) : (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadFeed(feed, true)}
                            tintColor={HN_ORANGE}
                        />
                    }
                >
                    {displayItems.length === 0 ? (
                        <View style={s.emptyBox}>
                            <Ionicons name="hourglass-outline" size={32} color={colors.mutedLight} />
                            <Text style={[s.emptyText, { color: colors.muted }]}>
                                Bu filtre için sonuç bulunamadı.
                            </Text>
                        </View>
                    ) : (
                        displayItems.map((item, idx) => (
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
