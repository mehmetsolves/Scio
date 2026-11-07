import { memo, useMemo, useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { MenuButton } from './HamburgerMenu'
import { searchArticles, type Article } from '../api/client'
import { topicQuery } from '../api/topics'
import { useCachedResource } from '../api/cache'
import { formatNewsDate, type NewsArticle } from '../api/news'
import { categoryLabel } from '../api/sources'
import { useSettings } from '../store/SettingsContext'
import { useCustomSources } from '../store/CustomSourcesContext'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { searchItems } from '../utils/search'
import SearchBar from '../components/SearchBar'
import FilterChips, { type FilterOption } from '../components/FilterChips'
import { SkeletonList, EmptyState } from '../components/ListStates'
import { SOURCE_META, type ColorScheme } from '../theme/colors'

const SERIF_BOLD = 'SourceSerif4_700Bold'
const SERIF_SEMIBOLD = 'SourceSerif4_600SemiBold'
const SANS = 'Inter_400Regular'
const SANS_MEDIUM = 'Inter_500Medium'
const SANS_SEMIBOLD = 'Inter_600SemiBold'

// Onboarding'de en fazla 3 konu için aramayı başlat: akademik her kaynak
// ~5-15 makale döndürüyor ve konu sayısı kadar arama yapıldığı için her
// ek konu ilk boyamayı artırıyor.
const MAX_AUTO_TOPICS = 3

// Akademik API'ye canlı arama için en az karakter (kısa sorgular gürültülü
// ve gereksiz istek demek).
const MIN_REMOTE_QUERY = 3

interface TopicSection {
    label: string
    articles: Article[]
    error: string | null
}

type Scope = 'all' | 'feed' | 'sources' | 'academic'

const SCOPE_OPTIONS: FilterOption[] = [
    { id: 'all', label: 'Tümü' },
    { id: 'feed', label: 'Akışım' },
    { id: 'sources', label: 'Kaynaklarım' },
    { id: 'academic', label: 'Akademik veritabanları' },
]

function SourceBadge({ source }: { source: string }) {
    const key = source.toLowerCase().replace(/\s/g, '') as keyof typeof SOURCE_META
    const meta = SOURCE_META[key] ?? { label: source, color: '#6B6560', bg: '#F5F0EA' }
    return (
        <View style={[s.badge, { backgroundColor: meta.bg }]}>
            <Text style={[s.badgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
    )
}

const ArticleCard = memo(function ArticleCard({
    article,
    onPress,
    colors,
}: {
    article: Article
    onPress: (a: Article) => void
    colors: ColorScheme
}) {
    const authors = Array.isArray(article.authors) ? article.authors.join(', ') : String(article.authors ?? '')
    return (
        <Pressable
            onPress={() => onPress(article)}
            style={({ pressed }) => [
                s.card,
                { backgroundColor: pressed ? colors.pressedCard : colors.card, borderColor: colors.border },
            ]}
        >
            <View style={s.badgeRow}>
                <SourceBadge source={article.source} />
            </View>
            <Text style={[s.cardTitle, { color: colors.ink }]}>{article.title}</Text>
            <View style={s.metaRow}>
                <Text style={[s.metaText, { color: colors.muted }]} numberOfLines={1}>
                    {authors}
                </Text>
                <Text style={[s.metaDot, { color: colors.inputBorder }]}>·</Text>
                <Text style={[s.metaText, { color: colors.muted }]}>{article.year}</Text>
            </View>
        </Pressable>
    )
})

const SourceItemCard = memo(function SourceItemCard({
    item,
    sourceLabel,
    onOpenUrl,
    colors,
}: {
    item: NewsArticle
    sourceLabel: string
    onOpenUrl: (url: string, title: string) => void
    colors: ColorScheme
}) {
    return (
        <Pressable
            onPress={() => onOpenUrl(item.link, item.title)}
            style={({ pressed }) => [
                s.card,
                { backgroundColor: pressed ? colors.pressedCard : colors.card, borderColor: colors.border },
            ]}
        >
            <View style={[s.metaRow, { marginBottom: 8 }]}>
                <Text style={[s.sourceLabel, { color: colors.burgundy }]} numberOfLines={1}>
                    {sourceLabel}
                </Text>
                <Text style={[s.metaText, { color: colors.mutedLight }]}>{formatNewsDate(item.pubDate)}</Text>
            </View>
            <Text style={[s.cardTitle, { color: colors.ink }]} numberOfLines={3}>
                {item.title}
            </Text>
            {item.description ? (
                <Text style={[s.cardDesc, { color: colors.cardAbstract }]} numberOfLines={2}>
                    {item.description}
                </Text>
            ) : null}
        </Pressable>
    )
})

const articleFields = (a: Article) => [
    a.title,
    a.abstract,
    Array.isArray(a.authors) ? a.authors.join(' ') : String(a.authors ?? ''),
    a.journal,
]

function DiscoverScreen({
    colors,
    onArticle,
    onOpenTopics,
    onOpenMenu,
    onOpenUrl,
    onSearch,
}: {
    colors: ColorScheme
    onArticle: (a: Article) => void
    onOpenTopics: () => void
    onOpenMenu?: () => void
    onOpenUrl: (url: string, title: string) => void
    // Akademik aramada tüm sayfalı sonuçlar için Sonuçlar ekranını açar
    onSearch: (q: string, mode?: 'academic' | 'news') => void
}) {
    const { selectedTopics, sources } = useSettings()
    const { allArticles: sourceArticles, customSources } = useCustomSources()

    const [query, setQuery] = useState('')
    const debouncedQuery = useDebouncedValue(query)
    const q = debouncedQuery.trim()
    const [scope, setScope] = useState<Scope>('all')

    const topics = selectedTopics.slice(0, MAX_AUTO_TOPICS)
    const sourcesKey = sources.join(',')

    // ── İlgi alanı akışı ──
    // Tek önbellek kaydı: sekmeye dönüşte anında, 10 dk içinde tekrar istek
    // yok. Eski kod önbelleğe BOŞ liste yazıyordu; sekmeye geri dönünce
    // "Sonuç bulunamadı" görünüyordu.
    const feedKey = topics.length > 0 ? `discover:${topics.join('|')}:${sourcesKey}` : null
    const feed = useCachedResource<TopicSection[]>(
        feedKey,
        async () => {
            const results = await Promise.allSettled(topics.map((label) => searchArticles(topicQuery(label), sources, 1)))
            // Hepsi başarısızsa hata fırlat: hatalı sonuç 10 dk önbellekte kalmasın
            const firstError = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined
            if (results.every((r) => r.status === 'rejected')) {
                throw new Error((firstError?.reason as Error)?.message || 'Makaleler yüklenemedi')
            }
            return topics.map((label, i) => {
                const r = results[i]
                return r.status === 'fulfilled'
                    ? { label, articles: r.value, error: null }
                    : { label, articles: [], error: (r.reason as Error)?.message || 'Yüklenemedi' }
            })
        },
        { ttl: 10 * 60 * 1000, persist: true },
    )

    // ── Canlı akademik arama (debounce + önbellek) ──
    // Kullanıcı yazmayı bırakınca tek istek gider; aynı sorgu 10 dk içinde
    // tekrar aranırsa ağa çıkılmaz.
    const wantsRemote = q.length >= MIN_REMOTE_QUERY && (scope === 'all' || scope === 'academic')
    const remote = useCachedResource<Article[]>(
        wantsRemote ? `search:${sourcesKey}:${q.toLowerCase()}` : null,
        () => searchArticles(q, sources, 1),
        { ttl: 10 * 60 * 1000 },
    )

    const labelOf = useMemo(() => {
        const map = new Map(customSources.map((src) => [src.id, `${src.label} · ${categoryLabel(src.category)}`]))
        return (id: string) => map.get(id) ?? id
    }, [customSources])

    // ── Yerel arama: akıştaki makaleler + özel kaynak indeksi ──
    const feedMatches = useMemo(() => {
        if (!q || (scope !== 'all' && scope !== 'feed')) return []
        const seen = new Set<string>()
        const all: Article[] = []
        for (const sec of feed.data ?? []) {
            for (const a of sec.articles) {
                if (seen.has(a.id)) continue
                seen.add(a.id)
                all.push(a)
            }
        }
        return searchItems(all, q, articleFields)
    }, [q, scope, feed.data])

    const sourceMatches = useMemo(() => {
        if (!q || (scope !== 'all' && scope !== 'sources')) return []
        return searchItems(sourceArticles, q, (a) => [a.title, a.description, a.category, labelOf(a.source)])
    }, [q, scope, sourceArticles, labelOf])

    const remoteResults = wantsRemote ? remote.data ?? [] : []
    const searching = q.length > 0
    const remoteBusy = wantsRemote && remote.loading
    const typing = query.trim() !== q

    const header = (
        <View style={[s.header, { borderBottomColor: colors.border }]}>
            <View style={s.headerRow}>
                <View style={{ flex: 1 }}>
                    <Text style={[s.title, { color: colors.ink }]}>Makaleler</Text>
                    <Text style={[s.subtitle, { color: colors.mutedLight }]}>İlgi alanlarına göre keşfet</Text>
                </View>
                <MenuButton onPress={onOpenMenu ?? (() => {})} colors={colors} />
            </View>
            <SearchBar
                value={query}
                onChangeText={setQuery}
                placeholder="Makale, yazar veya konu ara..."
                accent={colors.burgundy}
                colors={colors}
                busy={typing || remoteBusy}
                onSubmit={(text) => {
                    if (text) onSearch(text, 'academic')
                }}
            />
            {query.length > 0 && (
                <FilterChips
                    options={SCOPE_OPTIONS}
                    value={scope}
                    onChange={(id) => setScope(id as Scope)}
                    accent={colors.burgundy}
                    colors={colors}
                />
            )}
        </View>
    )

    // ── Arama görünümü ──
    if (searching) {
        const total = feedMatches.length + sourceMatches.length + remoteResults.length
        const nothing = total === 0 && !remoteBusy && !typing
        return (
            <View style={{ flex: 1, backgroundColor: colors.cream }}>
                {header}
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={s.body}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                >
                    {feedMatches.length > 0 && (
                        <View style={s.section}>
                            <Text style={[s.sectionTitle, { color: colors.burgundy }]}>Akışında · {feedMatches.length}</Text>
                            {feedMatches.map((a) => (
                                <ArticleCard key={`feed-${a.id}`} article={a} onPress={onArticle} colors={colors} />
                            ))}
                        </View>
                    )}

                    {sourceMatches.length > 0 && (
                        <View style={s.section}>
                            <Text style={[s.sectionTitle, { color: colors.burgundy }]}>Kaynaklarından · {sourceMatches.length}</Text>
                            {sourceMatches.slice(0, 30).map((a) => (
                                <SourceItemCard
                                    key={`src-${a.id}`}
                                    item={a}
                                    sourceLabel={labelOf(a.source)}
                                    onOpenUrl={onOpenUrl}
                                    colors={colors}
                                />
                            ))}
                        </View>
                    )}

                    {(scope === 'all' || scope === 'academic') && (
                        <View style={s.section}>
                            <Text style={[s.sectionTitle, { color: colors.burgundy }]}>
                                Akademik veritabanları{remoteResults.length ? ` · ${remoteResults.length}` : ''}
                            </Text>
                            {q.length < MIN_REMOTE_QUERY ? (
                                <Text style={[s.emptyTextSmall, { color: colors.mutedLight }]}>
                                    Akademik arama için en az {MIN_REMOTE_QUERY} harf yaz.
                                </Text>
                            ) : remoteBusy ? (
                                <ActivityIndicator size="small" color={colors.burgundy} style={{ alignSelf: 'flex-start' }} />
                            ) : remote.error && remoteResults.length === 0 ? (
                                <Text style={[s.errorText, { color: colors.muted }]}>{remote.error}</Text>
                            ) : remoteResults.length === 0 ? (
                                <Text style={[s.emptyTextSmall, { color: colors.mutedLight }]}>Akademik sonuç yok.</Text>
                            ) : (
                                <>
                                    {remoteResults.map((a) => (
                                        <ArticleCard key={`remote-${a.id}`} article={a} onPress={onArticle} colors={colors} />
                                    ))}
                                    <Pressable
                                        onPress={() => onSearch(q, 'academic')}
                                        accessibilityRole="button"
                                        style={[s.moreBtn, { borderColor: colors.burgundy }]}
                                    >
                                        <Text style={[s.moreBtnText, { color: colors.burgundy }]}>Tüm akademik sonuçları gör</Text>
                                        <Ionicons name="arrow-forward" size={14} color={colors.burgundy} />
                                    </Pressable>
                                </>
                            )}
                        </View>
                    )}

                    {nothing && (
                        <EmptyState
                            icon="search-outline"
                            title="Sonuç bulunamadı"
                            subtitle={`"${q}" için akışında, kaynaklarında veya akademik veritabanlarında eşleşme yok.`}
                            actionLabel="Aramayı temizle"
                            onAction={() => setQuery('')}
                            accent={colors.burgundy}
                            colors={colors}
                        />
                    )}
                    <View style={{ height: 28 }} />
                </ScrollView>
            </View>
        )
    }

    // ── Akış görünümü ──
    if (selectedTopics.length === 0) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.cream }}>
                {header}
                <View style={s.emptyBox}>
                    <Ionicons name="compass-outline" size={44} color={colors.mutedLight} />
                    <Text style={[s.emptyTitle, { color: colors.ink }]}>Henüz ilgi alanı seçmedin</Text>
                    <Text style={[s.emptyText, { color: colors.muted }]}>
                        Ayarlar'dan konu seçtiğinde sana özel makale akışı oluşur. Yukarıdan arama yapabilirsin.
                    </Text>
                    <Pressable
                        onPress={onOpenTopics}
                        accessibilityLabel="İlgi alanı seç"
                        accessibilityRole="button"
                        style={[s.emptyBtn, { backgroundColor: colors.burgundy }]}
                    >
                        <Text style={s.emptyBtnText}>İlgi alanı seç</Text>
                    </Pressable>
                </View>
            </View>
        )
    }

    const sections = feed.data ?? []
    const hasAny = sections.some((sec) => sec.articles.length > 0)

    return (
        <View style={{ flex: 1, backgroundColor: colors.cream }}>
            {header}

            {feed.loading ? (
                <SkeletonList colors={colors} />
            ) : (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={s.body}
                    refreshControl={
                        <RefreshControl
                            refreshing={feed.refreshing}
                            onRefresh={feed.refresh}
                            colors={[colors.burgundy]}
                            tintColor={colors.burgundy}
                        />
                    }
                >
                    <Text style={[s.intro, { color: colors.mutedLight }]}>
                        {selectedTopics.length > MAX_AUTO_TOPICS
                            ? `${MAX_AUTO_TOPICS} / ${selectedTopics.length} konudan öneriler`
                            : 'İlgi alanlarına göre akademik makaleler'}
                    </Text>

                    {sections.map((sec) => (
                        <View key={sec.label} style={s.section}>
                            <Text style={[s.sectionTitle, { color: colors.burgundy }]}>{sec.label}</Text>
                            {sec.error ? (
                                <Text style={[s.errorText, { color: colors.muted }]}>{sec.error}</Text>
                            ) : sec.articles.length === 0 ? (
                                <Text style={[s.emptyTextSmall, { color: colors.mutedLight }]}>Bu konuda sonuç bulunamadı</Text>
                            ) : (
                                sec.articles.map((article, i) => (
                                    <ArticleCard
                                        key={`${sec.label}-${article.id ?? i}`}
                                        article={article}
                                        onPress={onArticle}
                                        colors={colors}
                                    />
                                ))
                            )}
                        </View>
                    ))}

                    {!hasAny && (
                        <EmptyState
                            icon={feed.error ? 'cloud-offline-outline' : 'search-outline'}
                            title={feed.error ? 'Makaleler yüklenemedi' : 'Sonuç bulunamadı'}
                            subtitle={
                                feed.error ??
                                'Filtreleri genişletmek için ayarlardan akademik kaynakları açabilirsin.'
                            }
                            actionLabel="Tekrar dene"
                            onAction={feed.refresh}
                            accent={colors.burgundy}
                            colors={colors}
                        />
                    )}
                    <View style={{ height: 28 }} />
                </ScrollView>
            )}
        </View>
    )
}

export default memo(DiscoverScreen)

const s = StyleSheet.create({
    header: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 14,
        borderBottomWidth: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    title: {
        fontFamily: SERIF_BOLD,
        fontSize: 26,
        lineHeight: 32,
    },
    subtitle: {
        fontFamily: SANS,
        fontSize: 12,
        marginTop: 2,
    },
    body: {
        padding: 20,
        gap: 22,
    },
    intro: {
        fontFamily: SANS,
        fontSize: 12,
        marginBottom: -10,
    },
    section: {
        gap: 10,
    },
    sectionTitle: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 11,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    card: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
    },
    badgeRow: {
        marginBottom: 8,
        flexDirection: 'row',
    },
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
    cardTitle: {
        fontFamily: SERIF_SEMIBOLD,
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 6,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: { fontFamily: SANS, fontSize: 12, flexShrink: 1 },
    metaDot: { fontSize: 12 },
    sourceLabel: {
        flex: 1,
        fontFamily: SANS_SEMIBOLD,
        fontSize: 10,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    cardDesc: {
        fontFamily: SANS,
        fontSize: 13,
        lineHeight: 19,
    },
    moreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 10,
    },
    moreBtnText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 13,
    },
    emptyBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        gap: 10,
    },
    emptyTitle: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 17,
        textAlign: 'center',
    },
    emptyText: {
        fontFamily: SANS,
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },
    emptyTextSmall: {
        fontFamily: SANS,
        fontSize: 12,
    },
    errorText: {
        fontFamily: SANS,
        fontSize: 12,
        lineHeight: 18,
    },
    emptyBtn: {
        marginTop: 8,
        paddingHorizontal: 22,
        paddingVertical: 11,
        borderRadius: 8,
    },
    emptyBtnText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 13,
        color: '#FFFFFF',
    },
})
