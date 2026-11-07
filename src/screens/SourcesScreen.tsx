import { memo, useCallback, useMemo, useState } from 'react'
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    FlatList,
    RefreshControl,
    ActivityIndicator,
    Alert,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useCustomSources, type CustomSource } from '../store/CustomSourcesContext'
import { SOURCE_CATEGORIES, categoryLabel, type SourceCategory } from '../api/sources'
import { filterNews, formatNewsDate, type NewsArticle } from '../api/news'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import SearchBar from '../components/SearchBar'
import FilterChips, { type FilterOption } from '../components/FilterChips'
import { EmptyState } from '../components/ListStates'
import type { ColorScheme } from '../theme/colors'

const SERIF_BOLD = 'SourceSerif4_700Bold'
const SERIF_SEMIBOLD = 'SourceSerif4_600SemiBold'
const SANS = 'Inter_400Regular'
const SANS_MEDIUM = 'Inter_500Medium'
const SANS_SEMIBOLD = 'Inter_600SemiBold'

function formatSynced(ts: number): string {
    if (!ts) return 'henüz çekilmedi'
    return formatNewsDate(new Date(ts).toISOString())
}

// ─── Kaynak ekleme formu ─────────────────────────────────────────────────────

function AddSourceForm({ colors, onDone }: { colors: ColorScheme; onDone: () => void }) {
    const { addSource } = useCustomSources()
    const [label, setLabel] = useState('')
    const [url, setUrl] = useState('')
    const [category, setCategory] = useState<SourceCategory>('news')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const canSave = url.trim().length > 0 && !saving

    const handleAdd = async () => {
        if (!canSave) return
        setSaving(true)
        setError(null)
        try {
            const result = await addSource(label, url, category)
            if (result.ok) {
                setLabel('')
                setUrl('')
                Alert.alert(
                    'Kaynak eklendi',
                    `${result.source.label}: ${result.count} içerik çekildi ve aramaya eklendi.`,
                )
                onDone()
            } else {
                setError(result.error)
            }
        } finally {
            setSaving(false)
        }
    }

    const inputStyle = [s.input, { color: colors.ink, borderColor: colors.inputBorder, backgroundColor: colors.cream }]

    return (
        <View style={[s.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.formTitle, { color: colors.burgundy }]}>Yeni kaynak</Text>
            <Text style={[s.formHint, { color: colors.muted }]}>
                Sitenin adresini (ör. webtekno.com) ya da doğrudan RSS/Atom adresini yaz. RSS bağlantısı otomatik bulunur.
            </Text>

            <TextInput
                value={url}
                onChangeText={setUrl}
                placeholder="https://site.com veya https://site.com/rss"
                placeholderTextColor={colors.mutedLight}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                accessibilityLabel="Kaynak adresi"
                style={inputStyle}
            />
            <TextInput
                value={label}
                onChangeText={setLabel}
                placeholder="Görünecek ad (boşsa siteden alınır)"
                placeholderTextColor={colors.mutedLight}
                accessibilityLabel="Kaynak adı"
                style={inputStyle}
            />

            <Text style={[s.fieldLabel, { color: colors.muted }]}>Kategori</Text>
            <View style={s.catRow}>
                {SOURCE_CATEGORIES.map((c) => {
                    const active = c.id === category
                    return (
                        <Pressable
                            key={c.id}
                            onPress={() => setCategory(c.id)}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: active }}
                            accessibilityLabel={`${c.label}: ${c.hint}`}
                            style={[
                                s.catChip,
                                active
                                    ? { backgroundColor: colors.burgundy, borderColor: colors.burgundy }
                                    : { borderColor: colors.inputBorder },
                            ]}
                        >
                            <Text style={[s.catChipText, { color: active ? '#FFFFFF' : colors.muted }]}>{c.label}</Text>
                        </Pressable>
                    )
                })}
            </View>
            <Text style={[s.catHint, { color: colors.mutedLight }]}>
                {SOURCE_CATEGORIES.find((c) => c.id === category)?.hint}
            </Text>

            {error ? <Text style={[s.error, { color: '#C62828' }]}>{error}</Text> : null}

            <Pressable
                onPress={handleAdd}
                disabled={!canSave}
                accessibilityLabel="Kaynağı ekle"
                accessibilityRole="button"
                style={[s.addBtn, { backgroundColor: colors.burgundy, opacity: canSave ? 1 : 0.5 }]}
            >
                {saving ? (
                    <View style={s.savingRow}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={s.addBtnText}>Kaynak aranıyor...</Text>
                    </View>
                ) : (
                    <Text style={s.addBtnText}>Kaynağı ekle</Text>
                )}
            </Pressable>
        </View>
    )
}

// ─── Seçili kaynağın bilgi şeridi ────────────────────────────────────────────

function SourceInfo({ source, colors }: { source: CustomSource; colors: ColorScheme }) {
    const { sourceIndex, syncSources, removeSource, syncing } = useCustomSources()
    const idx = sourceIndex[source.id]

    const confirmRemove = () => {
        Alert.alert('Kaynağı sil', `${source.label} ve kayıtlı içerikleri silinsin mi?`, [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'Sil', style: 'destructive', onPress: () => removeSource(source.id) },
        ])
    }

    return (
        <View style={[s.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flex: 1, gap: 2 }}>
                <Text style={[s.infoTitle, { color: colors.ink }]} numberOfLines={1}>
                    {source.label} · {categoryLabel(source.category)}
                </Text>
                <Text style={[s.infoSub, { color: colors.mutedLight }]} numberOfLines={1}>
                    {source.rssUrl}
                </Text>
                <Text style={[s.infoSub, { color: idx?.error ? '#C62828' : colors.mutedLight }]} numberOfLines={2}>
                    {idx?.error ? `Son deneme başarısız: ${idx.error}` : `Güncellendi: ${formatSynced(idx?.syncedAt ?? 0)}`}
                </Text>
            </View>
            <Pressable
                onPress={() => syncSources([source.id])}
                disabled={syncing}
                hitSlop={8}
                accessibilityLabel={`${source.label} kaynağını yenile`}
                accessibilityRole="button"
                style={[s.iconBtn, { borderColor: colors.border }]}
            >
                {syncing ? (
                    <ActivityIndicator size="small" color={colors.muted} />
                ) : (
                    <Ionicons name="refresh" size={15} color={colors.muted} />
                )}
            </Pressable>
            <Pressable
                onPress={confirmRemove}
                hitSlop={8}
                accessibilityLabel={`${source.label} kaynağını sil`}
                accessibilityRole="button"
                style={[s.iconBtn, { borderColor: colors.border }]}
            >
                <Ionicons name="trash-outline" size={15} color={colors.muted} />
            </Pressable>
        </View>
    )
}

// ─── Makale kartı ────────────────────────────────────────────────────────────

const SourceArticleCard = memo(function SourceArticleCard({
    article,
    sourceLabel,
    colors,
    onOpenUrl,
}: {
    article: NewsArticle
    sourceLabel: string
    colors: ColorScheme
    onOpenUrl: (url: string, title: string) => void
}) {
    return (
        <Pressable
            onPress={() => onOpenUrl(article.link, article.title)}
            style={({ pressed }) => [
                s.card,
                { backgroundColor: pressed ? colors.pressedCard : colors.card, borderColor: colors.border },
            ]}
        >
            <View style={s.cardHeader}>
                <Text style={[s.cardSource, { color: colors.burgundy }]} numberOfLines={1}>
                    {sourceLabel}
                </Text>
                <Text style={[s.cardTime, { color: colors.mutedLight }]}>{formatNewsDate(article.pubDate)}</Text>
            </View>
            <Text style={[s.cardTitle, { color: colors.ink }]} numberOfLines={3}>
                {article.title}
            </Text>
            {article.description ? (
                <Text style={[s.cardDesc, { color: colors.cardAbstract }]} numberOfLines={2}>
                    {article.description}
                </Text>
            ) : null}
        </Pressable>
    )
})

// ─── Ekran ───────────────────────────────────────────────────────────────────

export default function SourcesScreen({
    colors,
    onBack,
    onOpenUrl,
}: {
    colors: ColorScheme
    onBack: () => void
    onOpenUrl: (url: string, title: string) => void
}) {
    const { customSources, allArticles, syncSources, syncing } = useCustomSources()
    const [formOpen, setFormOpen] = useState(customSources.length === 0)
    const [categoryFilter, setCategoryFilter] = useState<string>('all')
    const [sourceFilter, setSourceFilter] = useState<string>('all')
    const [query, setQuery] = useState('')
    const debouncedQuery = useDebouncedValue(query)

    const labelOf = useMemo(() => {
        const map = new Map(customSources.map((src) => [src.id, src.label]))
        return (id: string) => map.get(id) ?? id
    }, [customSources])

    // Kategori filtresi yalnızca o kategoride kaynak varsa görünür
    const categoryOptions: FilterOption[] = useMemo(() => {
        const used = new Set(customSources.map((src) => src.category))
        return [
            { id: 'all', label: 'Tüm kategoriler' },
            ...SOURCE_CATEGORIES.filter((c) => used.has(c.id)).map((c) => ({ id: c.id, label: c.label })),
        ]
    }, [customSources])

    const sourcesInCategory = useMemo(
        () => (categoryFilter === 'all' ? customSources : customSources.filter((src) => src.category === categoryFilter)),
        [customSources, categoryFilter],
    )

    const sourceOptions: FilterOption[] = useMemo(
        () => [{ id: 'all', label: 'Tüm kaynaklar' }, ...sourcesInCategory.map((src) => ({ id: src.id, label: src.label }))],
        [sourcesInCategory],
    )

    const selectedSource = customSources.find((src) => src.id === sourceFilter)

    const visible = useMemo(() => {
        const allowed = new Set(
            (selectedSource ? [selectedSource] : sourcesInCategory).map((src) => src.id),
        )
        const scoped = allArticles.filter((a) => allowed.has(a.source))
        return filterNews(scoped, debouncedQuery, customSources)
    }, [allArticles, selectedSource, sourcesInCategory, debouncedQuery, customSources])

    const renderItem = useCallback(
        ({ item }: { item: NewsArticle }) => (
            <SourceArticleCard article={item} sourceLabel={labelOf(item.source)} colors={colors} onOpenUrl={onOpenUrl} />
        ),
        [labelOf, colors, onOpenUrl],
    )

    const searching = debouncedQuery.trim().length > 0

    return (
        <View style={{ flex: 1, backgroundColor: colors.cream }}>
            <View style={[s.header, { borderBottomColor: colors.border }]}>
                <View style={s.headerRow}>
                    <Pressable
                        onPress={onBack}
                        hitSlop={10}
                        accessibilityLabel="Geri"
                        accessibilityRole="button"
                        style={s.backBtn}
                    >
                        <Ionicons name="arrow-back" size={20} color={colors.ink} />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.title, { color: colors.ink }]}>Kaynaklarım</Text>
                        <Text style={[s.subtitle, { color: colors.mutedLight }]}>
                            {customSources.length} kaynak · {allArticles.length} içerik
                        </Text>
                    </View>
                    <Pressable
                        onPress={() => setFormOpen((v) => !v)}
                        hitSlop={8}
                        accessibilityLabel={formOpen ? 'Ekleme formunu kapat' : 'Kaynak ekle'}
                        accessibilityRole="button"
                        style={[s.iconBtn, { borderColor: colors.border }]}
                    >
                        <Ionicons name={formOpen ? 'close' : 'add'} size={18} color={colors.burgundy} />
                    </Pressable>
                </View>

                {customSources.length > 0 && (
                    <>
                        <SearchBar
                            value={query}
                            onChangeText={setQuery}
                            placeholder="Kaynaklarımda ara..."
                            accent={colors.burgundy}
                            colors={colors}
                            busy={query.trim() !== debouncedQuery.trim()}
                        />
                        <FilterChips
                            options={categoryOptions}
                            value={categoryFilter}
                            onChange={(id) => {
                                setCategoryFilter(id)
                                setSourceFilter('all')
                            }}
                            accent={colors.burgundy}
                            colors={colors}
                        />
                        <FilterChips
                            options={sourceOptions}
                            value={sourceFilter}
                            onChange={setSourceFilter}
                            accent={colors.navy}
                            colors={colors}
                        />
                    </>
                )}
            </View>

            <FlatList
                data={customSources.length === 0 ? [] : visible}
                keyExtractor={(a) => a.id}
                renderItem={renderItem}
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                initialNumToRender={8}
                windowSize={7}
                ListHeaderComponent={
                    <View style={{ gap: 12, marginBottom: 12 }}>
                        {formOpen && <AddSourceForm colors={colors} onDone={() => setFormOpen(false)} />}
                        {selectedSource && <SourceInfo source={selectedSource} colors={colors} />}
                        {customSources.length > 0 && (
                            <Text style={[s.count, { color: colors.mutedLight }]}>
                                {searching ? `"${debouncedQuery.trim()}" için ${visible.length} sonuç` : `${visible.length} içerik`}
                            </Text>
                        )}
                    </View>
                }
                ListEmptyComponent={
                    customSources.length === 0 ? (
                        formOpen ? undefined : (
                            <EmptyState
                                icon="globe-outline"
                                title="Henüz kaynak eklemedin"
                                subtitle="Takip ettiğin siteleri ekle; içerikleri burada ve ilgili sekmelerde aranabilir olsun."
                                actionLabel="Kaynak ekle"
                                onAction={() => setFormOpen(true)}
                                accent={colors.burgundy}
                                colors={colors}
                            />
                        )
                    ) : searching ? (
                        <EmptyState
                            icon="search-outline"
                            title="Sonuç bulunamadı"
                            subtitle="Farklı bir kelime dene ya da filtreleri genişlet."
                            actionLabel="Aramayı temizle"
                            onAction={() => setQuery('')}
                            accent={colors.burgundy}
                            colors={colors}
                        />
                    ) : (
                        <EmptyState
                            icon="cloud-download-outline"
                            title="Bu kaynakta içerik yok"
                            subtitle="Aşağı çekerek kaynakları yenileyebilirsin."
                            accent={colors.burgundy}
                            colors={colors}
                        />
                    )
                }
                refreshControl={
                    <RefreshControl
                        refreshing={syncing}
                        onRefresh={() => syncSources(selectedSource ? [selectedSource.id] : sourcesInCategory.map((src) => src.id))}
                        colors={[colors.burgundy]}
                        tintColor={colors.burgundy}
                    />
                }
            />
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
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backBtn: {
        padding: 4,
    },
    title: {
        fontFamily: SERIF_BOLD,
        fontSize: 24,
        lineHeight: 30,
    },
    subtitle: {
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
    formCard: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        gap: 10,
    },
    formTitle: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 11,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    formHint: {
        fontFamily: SANS,
        fontSize: 12,
        lineHeight: 18,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontFamily: SANS,
        fontSize: 14,
    },
    fieldLabel: {
        fontFamily: SANS_MEDIUM,
        fontSize: 12,
        marginTop: 4,
    },
    catRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    catChip: {
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    catChipText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 12,
    },
    catHint: {
        fontFamily: SANS,
        fontSize: 11,
    },
    error: {
        fontFamily: SANS_MEDIUM,
        fontSize: 12,
        lineHeight: 18,
    },
    addBtn: {
        borderRadius: 8,
        paddingVertical: 11,
        alignItems: 'center',
        marginTop: 4,
    },
    addBtnText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 13,
        color: '#FFFFFF',
    },
    savingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
    },
    infoTitle: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 13,
    },
    infoSub: {
        fontFamily: SANS,
        fontSize: 11,
    },
    count: {
        fontFamily: SANS,
        fontSize: 11,
    },
    card: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    cardSource: {
        flex: 1,
        fontFamily: SANS_SEMIBOLD,
        fontSize: 10,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    cardTime: {
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
    },
})
