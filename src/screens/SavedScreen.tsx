import { useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native'

import Ionicons from '@expo/vector-icons/Ionicons'
import { useSavedArticles, type ReadingStatus, type SavedArticleEntry, type SavedHNEntry, type SavedEvrimEntry } from '../store/SavedArticlesContext'
import { useDownloads, type DownloadedArticle } from '../store/DownloadsContext'
import type { ColorScheme } from '../theme/colors'
import type { Article } from '../api/client'
import { extractDomain, timeAgo, type HNItem } from '../api/hn'
import { formatEvrimDate, type EvrimAgaciArticle } from '../api/evrimagaci'
import { SOURCE_META } from '../theme/colors'

const SERIF_BOLD = 'SourceSerif4_700Bold'
const SERIF_SEMIBOLD = 'SourceSerif4_600SemiBold'
const SANS = 'Inter_400Regular'
const SANS_MEDIUM = 'Inter_500Medium'
const SANS_SEMIBOLD = 'Inter_600SemiBold'
const HN_ORANGE = '#E65100'
const EA_GREEN = '#2D8C3E'

type SavedTab = 'all' | 'unread' | 'liked' | 'disliked'

const TABS: { id: SavedTab; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { id: 'all', icon: 'library-outline', label: 'Tümü' },
    { id: 'unread', icon: 'time-outline', label: 'Sonra Oku' },
    { id: 'liked', icon: 'thumbs-up-outline', label: 'Beğendim' },
    { id: 'disliked', icon: 'thumbs-down-outline', label: 'Beğenmedim' },
]

// Silme geri alınamaz (indirilenlerde saatlerce süren çeviri de gider), ama
// yanlışlıkla bir dokunuş yetiyordu. Tek yardımcıda toplu onay eklendi.
function confirmDelete(title: string, message: string, onConfirm: () => void) {
    Alert.alert(title, message, [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: onConfirm },
    ])
}

function SourceBadge({ source }: { source: string }) {
    const key = source.toLowerCase().replace(/\s/g, '') as keyof typeof SOURCE_META
    const meta = SOURCE_META[key] ?? { label: source, color: '#555', bg: '#EEE' }
    return (
        <View style={[s.badge, { backgroundColor: meta.bg }]}>
            <Text style={[s.badgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
    )
}

// ── Status action buttons ────────────────────────────────────────────────────

function StatusActions({
    currentStatus,
    onSetStatus,
    colors,
}: {
    currentStatus: ReadingStatus
    onSetStatus: (status: ReadingStatus) => void
    colors: ColorScheme
}) {
    return (
        <View style={[s.statusRow, { borderTopColor: colors.border }]}>
            {currentStatus === 'unread' && (
                <>
                    <Pressable
                        onPress={() => onSetStatus('read_liked')}
                        accessibilityLabel="Beğendim olarak işaretle"
                        accessibilityRole="button"
                        style={({ pressed }) => [
                            s.statusBtn,
                            { opacity: pressed ? 0.6 : 1 },
                        ]}
                    >
                        <Ionicons name="thumbs-up-outline" size={14} color={colors.muted} />
                        <Text style={[s.statusBtnText, { color: colors.muted }]}>Beğendim</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => onSetStatus('read_disliked')}
                        accessibilityLabel="Beğenmedim olarak işaretle"
                        accessibilityRole="button"
                        style={({ pressed }) => [
                            s.statusBtn,
                            { opacity: pressed ? 0.6 : 1 },
                        ]}
                    >
                        <Ionicons name="thumbs-down-outline" size={14} color={colors.muted} />
                        <Text style={[s.statusBtnText, { color: colors.muted }]}>Beğenmedim</Text>
                    </Pressable>
                </>
            )}
            {currentStatus === 'read_liked' && (
                <Pressable
                    onPress={() => onSetStatus('unread')}
                    accessibilityLabel="Sonra oku olarak işaretle"
                    accessibilityRole="button"
                    style={({ pressed }) => [
                        s.statusBtn,
                        { opacity: pressed ? 0.6 : 1 },
                    ]}
                >
                    <Ionicons name="arrow-undo-outline" size={14} color={colors.muted} />
                    <Text style={[s.statusBtnText, { color: colors.muted }]}>Sonra Oku'ya taşı</Text>
                </Pressable>
            )}
            {currentStatus === 'read_disliked' && (
                <Pressable
                    onPress={() => onSetStatus('unread')}
                    accessibilityLabel="Sonra oku olarak işaretle"
                    accessibilityRole="button"
                    style={({ pressed }) => [
                        s.statusBtn,
                        { opacity: pressed ? 0.6 : 1 },
                    ]}
                >
                    <Ionicons name="arrow-undo-outline" size={14} color={colors.muted} />
                    <Text style={[s.statusBtnText, { color: colors.muted }]}>Sonra Oku'ya taşı</Text>
                </Pressable>
            )}
        </View>
    )
}

// ── Status indicator badge ───────────────────────────────────────────────────

function StatusBadge({ status, colors }: { status: ReadingStatus; colors: ColorScheme }) {
    if (status === 'unread') return null
    const liked = status === 'read_liked'
    const config = liked
        ? { icon: 'thumbs-up-outline' as const, label: 'Beğenildi' }
        : { icon: 'thumbs-down-outline' as const, label: 'Beğenilmedi' }
    return (
        <View style={s.statusBadge}>
            <Ionicons name={config.icon} size={10} color={colors.muted} />
            <Text style={[s.statusBadgeText, { color: colors.muted }]}>{config.label}</Text>
        </View>
    )
}

export default function SavedScreen({
    colors,
    onArticle,
    onHNItem,
    onOpenUrl,
    onOfflineArticle,
}: {
    colors: ColorScheme
    onArticle: (a: Article) => void
    onHNItem: (item: HNItem) => void
    onOpenUrl?: (url: string, title: string) => void
    onOfflineArticle: (item: DownloadedArticle) => void
}) {
    const {
        savedArticleEntries, savedHNEntries, savedEvrimEntries,
        removeArticle, removeHNItem, removeEvrimArticle,
        setArticleStatus, setHNStatus, setEvrimStatus,
    } = useSavedArticles()
    const { downloaded, removeDownload } = useDownloads()

    const [activeTab, setActiveTab] = useState<SavedTab>('all')

    // Filter entries by tab
    const filterByTab = <T extends { status: ReadingStatus }>(entries: T[]): T[] => {
        switch (activeTab) {
            case 'unread': return entries.filter(e => e.status === 'unread')
            case 'liked': return entries.filter(e => e.status === 'read_liked')
            case 'disliked': return entries.filter(e => e.status === 'read_disliked')
            default: return entries
        }
    }

    const filteredArticles = filterByTab(savedArticleEntries)
    const filteredHN = filterByTab(savedHNEntries)
    const filteredEvrim = filterByTab(savedEvrimEntries)
    const hasAny = filteredArticles.length + filteredHN.length + filteredEvrim.length + downloaded.length > 0

    // Count per tab for badges
    const countAll = savedArticleEntries.length + savedHNEntries.length + savedEvrimEntries.length
    const countUnread = savedArticleEntries.filter(e => e.status === 'unread').length
        + savedHNEntries.filter(e => e.status === 'unread').length
        + savedEvrimEntries.filter(e => e.status === 'unread').length
    const countLiked = savedArticleEntries.filter(e => e.status === 'read_liked').length
        + savedHNEntries.filter(e => e.status === 'read_liked').length
        + savedEvrimEntries.filter(e => e.status === 'read_liked').length
    const countDisliked = savedArticleEntries.filter(e => e.status === 'read_disliked').length
        + savedHNEntries.filter(e => e.status === 'read_disliked').length
        + savedEvrimEntries.filter(e => e.status === 'read_disliked').length

    const tabCounts: Record<SavedTab, number> = {
        all: countAll,
        unread: countUnread,
        liked: countLiked,
        disliked: countDisliked,
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.cream }}>
            {/* Header */}
            <View style={s.header}>
                <Text style={[s.screenTitle, { color: colors.ink }]}>Kaydedilenler</Text>
            </View>

            {/* Tab bar */}
            <View style={[s.tabBar, { borderBottomColor: colors.border }]}>
                {TABS.map((tab) => {
                    const isActive = activeTab === tab.id
                    const count = tabCounts[tab.id]
                    return (
                        <Pressable
                            key={tab.id}
                            onPress={() => setActiveTab(tab.id)}
                            accessibilityLabel={`${tab.label} (${count})`}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: isActive }}
                            style={[
                                s.tab,
                                isActive && { borderBottomColor: colors.burgundy, borderBottomWidth: 2 },
                            ]}
                        >
                            <Ionicons
                                name={tab.icon}
                                size={15}
                                color={isActive ? colors.burgundy : colors.mutedLight}
                            />
                            <Text style={[
                                s.tabText,
                                { color: isActive ? colors.burgundy : colors.mutedLight },
                            ]}>
                                {tab.label}
                            </Text>
                            {count > 0 && (
                                <View style={[
                                    s.tabCount,
                                    { backgroundColor: isActive ? colors.burgundy : colors.inputBorder },
                                ]}>
                                    <Text style={s.tabCountText}>{count}</Text>
                                </View>
                            )}
                        </Pressable>
                    )
                })}
            </View>

            {/* Content */}
            {!hasAny ? (
                <View style={s.emptyBox}>
                    <Ionicons
                        name={activeTab === 'all' ? 'library-outline' : activeTab === 'unread' ? 'time-outline' : activeTab === 'liked' ? 'thumbs-up-outline' : 'thumbs-down-outline'}
                        size={40}
                        color={colors.mutedLight}
                        style={{ marginBottom: 16 }}
                    />
                    <Text style={[s.emptyTitle, { color: colors.ink }]}>
                        {activeTab === 'all' ? 'Henüz kayıtlı makale yok'
                            : activeTab === 'unread' ? 'Sonra okunacak makale yok'
                            : activeTab === 'liked' ? 'Henüz beğenilen makale yok'
                            : 'Henüz beğenilmeyen makale yok'}
                    </Text>
                    <Text style={[s.emptySubtext, { color: colors.muted }]}>
                        {activeTab === 'all'
                            ? 'Bir makaleyi okurken kaydet butonuna basarak buraya ekleyebilirsin.'
                            : 'Kaydedilen makaleleri okuduktan sonra burada kategorize edebilirsin.'}
                    </Text>
                </View>
            ) : (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 28, gap: 16 }}>

                    {/* İndirilenler */}
                    {downloaded.length > 0 && (
                        <View style={{ gap: 10 }}>
                            <View style={s.sectionHead}>
                                <Ionicons name="cloud-download-outline" size={14} color={colors.burgundy} />
                                <Text style={[s.sectionTitle, { color: colors.burgundy }]}>İNDİRİLENLER</Text>
                            </View>
                            {downloaded.map((entry) => (
                                <View key={entry.id} style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <Pressable onPress={() => onOfflineArticle(entry)}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <View style={[s.badge, { backgroundColor: colors.burgundyTint }]}>
                                                <Text style={[s.badgeText, { color: colors.burgundy }]}>Offline</Text>
                                            </View>
                                            <Pressable
                                                onPress={() => confirmDelete(
                                                    'İndirileni sil',
                                                    'Bu makalenin çevrimdışı kopyası ve çevirisi silinecek. Çevrimdışı okunamayacak.',
                                                    () => removeDownload(entry.id),
                                                )}
                                                hitSlop={10}
                                                accessibilityLabel="İndirilen makaleyi sil"
                                                accessibilityRole="button"
                                                style={s.removeBtn}
                                            >
                                                <Ionicons name="close" size={15} color={colors.muted} />
                                            </Pressable>
                                        </View>
                                        <Text style={[s.cardTitle, { color: colors.ink }]} numberOfLines={3}>
                                            {entry.title}
                                        </Text>
                                        {entry.description ? (
                                            <Text style={[s.cardDesc, { color: colors.cardAbstract }]} numberOfLines={2}>
                                                {entry.description}
                                            </Text>
                                        ) : null}
                                        <View style={[s.row, { marginTop: 4 }]}>
                                            <Ionicons name="globe-outline" size={12} color={colors.mutedLight} />
                                            <Text style={[s.metaText, { color: colors.mutedLight }]}>
                                                {entry.origLang === 'tr' ? 'Türkçe' : 'İngilizce'}
                                            </Text>
                                            <Text style={[s.metaDot, { color: colors.inputBorder }]}>·</Text>
                                            <Text style={[s.metaText, { color: colors.mutedLight }]}>
                                                Offline oku</Text>
                                            <Ionicons name="chevron-forward" size={12} color={colors.mutedLight} />
                                        </View>
                                    </Pressable>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Academic Articles */}
                    {filteredArticles.length > 0 && (
                        <View style={{ gap: 10 }}>
                            <Text style={[s.sectionTitle, { color: colors.mutedLight }]}>AKADEMİK MAKALELER</Text>
                            {filteredArticles.map((entry) => {
                                const authorsStr = Array.isArray(entry.article.authors)
                                    ? entry.article.authors.join(', ')
                                    : String(entry.article.authors)
                                return (
                                    <View key={entry.article.id} style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                        <Pressable onPress={() => onArticle(entry.article)}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <SourceBadge source={entry.article.source} />
                                                    <StatusBadge status={entry.status} colors={colors} />
                                                </View>
                                                <Pressable
                                                    onPress={() => confirmDelete(
                                                        'Makaleyi sil',
                                                        'Bu makale kaydedilenlerden çıkarılacak. Çevirisi de silinecek.',
                                                        () => removeArticle(entry.article.id),
                                                    )}
                                                    hitSlop={10}
                                                    accessibilityLabel="Kaydedilen makaleyi sil"
                                                    accessibilityRole="button"
                                                    style={s.removeBtn}
                                                >
                                                    <Ionicons name="close" size={15} color={colors.muted} />
                                                </Pressable>
                                            </View>
                                            <Text style={[s.cardTitle, { color: colors.ink }]}>{entry.article.title}</Text>
                                            {entry.titleTr && (
                                                <Text style={[s.cardTitleTr, { color: colors.muted }]}>
                                                    {entry.titleTr}
                                                </Text>
                                            )}
                                            <View style={s.row}>
                                                <Text style={[s.metaText, { color: colors.muted }]}>{authorsStr}</Text>
                                                <Text style={[s.metaDot, { color: colors.inputBorder }]}>·</Text>
                                                <Text style={[s.metaText, { color: colors.muted }]}>{entry.article.year}</Text>
                                            </View>
                                        </Pressable>
                                        <StatusActions
                                            currentStatus={entry.status}
                                            onSetStatus={(status) => setArticleStatus(entry.article.id, status)}
                                            colors={colors}
                                        />
                                    </View>
                                )
                            })}
                        </View>
                    )}

                    {/* Evrim Ağacı */}
                    {filteredEvrim.length > 0 && (
                        <View style={{ gap: 10, marginTop: filteredArticles.length > 0 ? 10 : 0 }}>
                            <Text style={[s.sectionTitle, { color: EA_GREEN }]}>EVRİM AĞACI</Text>
                            {filteredEvrim.map((entry) => (
                                <View key={entry.article.id} style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <Pressable onPress={() => onOpenUrl?.(entry.article.link, entry.article.title)}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <View style={[s.badge, { backgroundColor: '#E8F5E9' }]}>
                                                    <Text style={[s.badgeText, { color: EA_GREEN }]}>Evrim Ağacı</Text>
                                                </View>
                                                <StatusBadge status={entry.status} colors={colors} />
                                            </View>
                                            <Pressable
                                                onPress={() => confirmDelete(
                                                    'Makaleyi sil',
                                                    'Bu Evrim Ağacı makalesi kaydedilenlerden çıkarılacak.',
                                                    () => removeEvrimArticle(entry.article.id),
                                                )}
                                                hitSlop={10}
                                                accessibilityLabel="Kaydedilen makaleyi sil"
                                                accessibilityRole="button"
                                                style={s.removeBtn}
                                            >
                                                <Ionicons name="close" size={15} color={colors.muted} />
                                            </Pressable>
                                        </View>
                                        <Text style={[s.cardTitle, { color: colors.ink }]} numberOfLines={3}>
                                            {entry.article.title}
                                        </Text>
                                        {entry.article.description ? (
                                            <Text style={[s.cardDesc, { color: colors.cardAbstract }]} numberOfLines={2}>
                                                {entry.article.description}
                                            </Text>
                                        ) : null}
                                        <Text style={[s.metaText, { color: colors.mutedLight, marginTop: 4 }]}>
                                            {formatEvrimDate(entry.article.pubDate)} · {entry.article.category}
                                        </Text>
                                    </Pressable>
                                    <StatusActions
                                        currentStatus={entry.status}
                                        onSetStatus={(status) => setEvrimStatus(entry.article.id, status)}
                                        colors={colors}
                                    />
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Hacker News */}
                    {filteredHN.length > 0 && (
                        <View style={{ gap: 10, marginTop: (filteredArticles.length > 0 || filteredEvrim.length > 0) ? 10 : 0 }}>
                            <Text style={[s.sectionTitle, { color: HN_ORANGE }]}>HACKER NEWS</Text>
                            {filteredHN.map((entry) => (
                                <View key={entry.item.id} style={[s.hnCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <Pressable onPress={() => onHNItem(entry.item)}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <View style={[s.badge, { backgroundColor: '#FFF3E0' }]}>
                                                    <Text style={[s.badgeText, { color: HN_ORANGE }]}>HN</Text>
                                                </View>
                                                <StatusBadge status={entry.status} colors={colors} />
                                            </View>
                                            <Pressable
                                                onPress={() => confirmDelete(
                                                    'Haber öğesini sil',
                                                    'Bu Hacker News öğesi kaydedilenlerden çıkarılacak.',
                                                    () => removeHNItem(entry.item.id),
                                                )}
                                                hitSlop={10}
                                                accessibilityLabel="Kaydedilen Hacker News öğesini sil"
                                                accessibilityRole="button"
                                                style={s.removeBtn}
                                            >
                                                <Ionicons name="close" size={15} color={colors.muted} />
                                            </Pressable>
                                        </View>
                                        <Text style={[s.cardTitle, { color: colors.ink }]} numberOfLines={3}>
                                            {entry.item.title}
                                        </Text>
                                        <View style={[s.row, { marginTop: 4 }]}>
                                            <Text style={[s.metaText, { color: colors.muted }]}>{extractDomain(entry.item.url)}</Text>
                                            <Text style={[s.metaDot, { color: colors.inputBorder }]}>·</Text>
                                            <Text style={[s.metaText, { color: colors.muted }]}>{timeAgo(entry.item.time)}</Text>
                                        </View>
                                    </Pressable>
                                    <StatusActions
                                        currentStatus={entry.status}
                                        onSetStatus={(status) => setHNStatus(entry.item.id, status)}
                                        colors={colors}
                                    />
                                </View>
                            ))}
                        </View>
                    )}

                    <View style={{ height: 20 }} />
                </ScrollView>
            )}
        </View>
    )
}

const s = StyleSheet.create({
    header: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 8,
    },
    screenTitle: {
        fontFamily: SERIF_BOLD,
        fontSize: 26,
        lineHeight: 32,
    },
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        paddingHorizontal: 12,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 4,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 11,
    },
    tabCount: {
        borderRadius: 8,
        paddingHorizontal: 5,
        paddingVertical: 1,
        minWidth: 18,
        alignItems: 'center',
    },
    tabCountText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 9,
        color: '#FFFFFF',
    },
    sectionTitle: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 11,
        letterSpacing: 1,
        marginBottom: 4,
    },
    emptyBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 8,
    },
    emptySubtext: {
        fontFamily: SANS,
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },
    card: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
    },
    hnCard: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
    },
    cardTitle: {
        fontFamily: SERIF_SEMIBOLD,
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 4,
    },
    cardTitleTr: {
        fontFamily: SANS,
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 8,
        fontStyle: 'italic',
    },
    cardDesc: {
        fontFamily: SANS,
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 4,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    metaText: { fontFamily: SANS, fontSize: 12 },
    metaDot: { fontSize: 12 },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 11,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
    removeBtn: {
        padding: 4,
    },
    statusRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    // Arka plan olmadan yalnızca ikon + etiket. Tema körümüş pastel bloklar
    // koyu temada sert durduğu için kaldırıldı; renk colors.muted ile
    // "Henüz kayıtlı makale yok" metniyle aynı tonda.
    statusBtn: {
        flex: 1,
        flexDirection: 'row',
        gap: 6,
        paddingVertical: 7,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusBtnText: {
        fontFamily: SANS_MEDIUM,
        fontSize: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statusBadgeText: {
        fontFamily: SANS_MEDIUM,
        fontSize: 10,
        letterSpacing: 0.3,
    },
    sectionHead: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
})
