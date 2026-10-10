import { useState, useEffect, useCallback, useMemo } from 'react'
import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
    StyleSheet,
    Platform,
    ActivityIndicator,
    Alert,
    BackHandler,
} from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import {
    useFonts,
    SourceSerif4_400Regular,
    SourceSerif4_400Regular_Italic,
    SourceSerif4_600SemiBold,
    SourceSerif4_700Bold,
} from '@expo-google-fonts/source-serif-4'
import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
} from '@expo-google-fonts/inter'

import Ionicons from '@expo/vector-icons/Ionicons'

import { SettingsProvider, useSettings } from './src/store/SettingsContext'
import { SavedArticlesProvider, useSavedArticles } from './src/store/SavedArticlesContext'
import { lightColors, darkColors, SOURCE_META, type ColorScheme } from './src/theme/colors'
import { searchArticles, translateText, summarizeText, type Article } from './src/api/client'
import { fetchStoryIds, fetchItems, extractDomain, timeAgo, type HNItem } from './src/api/hn'
import { fetchEvrimAgaciArticles, searchEvrimAgaci, formatEvrimDate, type EvrimAgaciArticle } from './src/api/evrimagaci'
import { fetchAllNews, filterNews, formatNewsDate, getNewsSourceMeta, NEWS_SOURCES, FALLBACK_SOURCE_META, type NewsArticle } from './src/api/news'
import SettingsScreen from './src/screens/SettingsScreen'
import SavedScreen from './src/screens/SavedScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import HNScreen from './src/screens/HNScreen'
import HNReaderScreen from './src/screens/HNReaderScreen'
import EvrimAgaciScreen from './src/screens/EvrimAgaciScreen'
import NewsScreen from './src/screens/NewsScreen'
import ArticleWebViewScreen from './src/screens/ArticleWebViewScreen'
import OnboardingScreen from './src/screens/OnboardingScreen'
import OfflineReaderScreen from './src/screens/OfflineReaderScreen'
import { DownloadsProvider, useDownloads, type DownloadedArticle } from './src/store/DownloadsContext'
import { CustomSourcesProvider, useCustomSources } from './src/store/CustomSourcesContext'
import DiscoverScreen from './src/screens/DiscoverScreen'
import HamburgerMenu from './src/screens/HamburgerMenu'

// ─── Types ───────────────────────────────────────────────────────────────────

type Screen = 'discover' | 'results' | 'detail' | 'settings' | 'saved' | 'profile' | 'hn' | 'hnReader' | 'webview' | 'evrimagaci' | 'news' | 'offlineReader'
type Lang = 'tr' | 'en'

// Alt bardaki dört sabit sekme. Kayıtlılar, Ayarlar ve Profil artık sekme
// değil — hamburger menüden açılıyor (bkz. HamburgerMenu).
type TabId = 'discover' | 'evrimagaci' | 'hn' | 'news'

const TAB_SCREENS: TabId[] = ['discover', 'evrimagaci', 'hn', 'news']

// Geri tuşunun uygulamadan çıkmasına izin verilen tek ekran: açılış ekranı.
const HOME_SCREEN: Screen = 'discover'

// ─── Font constants ──────────────────────────────────────────────────────────

const SERIF = 'SourceSerif4_400Regular'
const SERIF_ITALIC = 'SourceSerif4_400Regular_Italic'
const SERIF_SEMIBOLD = 'SourceSerif4_600SemiBold'
const SERIF_BOLD = 'SourceSerif4_700Bold'
const SANS = 'Inter_400Regular'
const SANS_MEDIUM = 'Inter_500Medium'
const SANS_SEMIBOLD = 'Inter_600SemiBold'

// ─── Sub-components ──────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
    const key = source.toLowerCase().replace(/\s/g, '') as keyof typeof SOURCE_META
    const meta = SOURCE_META[key] ?? { label: source, color: '#555', bg: '#EEE' }
    return (
        <View style={[styles.badge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
    )
}

function ArticleCard({
    article,
    onPress,
    compact = false,
    colors,
}: {
    article: Article
    onPress: () => void
    compact?: boolean
    colors: ColorScheme
}) {
    const [pressed, setPressed] = useState(false)
    const authorsStr = Array.isArray(article.authors) ? article.authors.join(', ') : String(article.authors)
    return (
        <Pressable
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            onPress={onPress}
            style={[
                styles.card,
                {
                    padding: compact ? 14 : 18,
                    paddingVertical: compact ? 14 : 18,
                    backgroundColor: pressed ? colors.pressedCard : colors.card,
                    borderColor: colors.border,
                },
            ]}
        >
            <View style={{ marginBottom: 10 }}>
                <SourceBadge source={article.source} />
            </View>
            <Text style={[styles.cardTitle, { fontSize: compact ? 15 : 16, color: colors.ink }]}>
                {article.title}
            </Text>
            <View style={[styles.row, { marginBottom: compact ? 0 : 10 }]}>
                <Text style={[styles.metaText, { color: colors.muted }]}>{authorsStr}</Text>
                <Text style={[styles.metaDot, { color: colors.inputBorder }]}>·</Text>
                <Text style={[styles.metaText, { color: colors.muted }]}>{article.year}</Text>
            </View>
            {!compact && (
                <Text style={[styles.cardAbstract, { color: colors.cardAbstract }]} numberOfLines={2}>
                    {article.abstract}
                </Text>
            )}
        </Pressable>
    )
}

// ─── Screen 2: Results ───────────────────────────────────────────────────────

function ResultsScreen({
    query,
    onBack,
    onArticle,
    onSearch,
    onOpenUrl,
    colors,
    mode = 'academic',
}: {
    query: string
    onBack: () => void
    onArticle: (a: Article) => void
    onSearch: (q: string) => void
    onOpenUrl: (url: string, title: string) => void
    colors: ColorScheme
    mode?: 'academic' | 'news'
}) {
    const { sources } = useSettings()
    const { customSources } = useCustomSources()
    const [articles, setArticles] = useState<Article[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [inputValue, setInputValue] = useState(query)
    const [evrimResults, setEvrimResults] = useState<EvrimAgaciArticle[]>([])
    const [newsResults, setNewsResults] = useState<NewsArticle[]>([])

    useEffect(() => {
        setInputValue(query)
    }, [query])

    // Initial load
    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError(null)
        setArticles([])
        setPage(1)
        setHasMore(true)

        const academic = mode === 'academic'

        if (academic) {
            searchArticles(query, sources, 1)
                .then((data) => {
                    if (cancelled) return
                    setArticles(data)
                    if (data.length === 0) setHasMore(false)
                })
                .catch((err) => {
                    if (cancelled) return
                    setError(err.message || 'Bir hata oluştu')
                })
                .finally(() => {
                    if (!cancelled) setLoading(false)
                })
            return
        }

        // Haber modunda: istemci tarafı filtre (RSS tam listesi çekilir)
        fetchAllNews(undefined, { sources: [...NEWS_SOURCES, ...customSources] })
            .then((all) => {
                if (cancelled) return
                setNewsResults(filterNews(all, query))
                setHasMore(false)
            })
            .catch((err) => {
                if (cancelled) return
                setError(err.message || 'Haberler yüklenemedi')
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [query, sources, mode, customSources])

    // Evrim Ağacı — yalnızca akademik aramada görünür (kendi sekmesi ayrı)
    useEffect(() => {
        if (mode !== 'academic') {
            setEvrimResults([])
            return
        }
        let cancelled = false
        searchEvrimAgaci(query)
            .then((data) => {
                if (!cancelled) setEvrimResults(data)
            })
            .catch(() => setEvrimResults([]))
        return () => {
            cancelled = true
        }
    }, [query, mode])

    // Sayfalama yalnızca akademik aramada var; haber RSS'i tek seferde 20-50
    // öğe döndürüyor.
    const loadMore = () => {
        if (mode !== 'academic') return
        const nextPage = page + 1
        setLoadingMore(true)
        searchArticles(query, sources, nextPage)
            .then((data) => {
                setArticles((prev) => [...prev, ...data])
                setPage(nextPage)
                if (data.length === 0) setHasMore(false)
            })
            .catch(() => {})
            .finally(() => setLoadingMore(false))
    }

    // Modad göre gösterilecek liste ve sonuç sayısı
    const academicMode = mode === 'academic'
    const listCount = academicMode ? articles.length : newsResults.length

    return (
        <View style={{ flex: 1, backgroundColor: colors.cream }}>
            <View style={[styles.navBar, { borderBottomColor: colors.border, backgroundColor: colors.cream }]}>
                <View style={styles.row}>
                    <Pressable
                        onPress={onBack}
                        hitSlop={8}
                        accessibilityLabel="Geri"
                        accessibilityRole="button"
                        style={{ padding: 6 }}
                    >
                        <Text style={[styles.backArrow, { color: colors.burgundy }]}>←</Text>
                    </Pressable>
                    <View style={[styles.queryPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <TextInput
                            style={[styles.queryPillText, { color: colors.ink, padding: 0 }]}
                            value={inputValue}
                            onChangeText={setInputValue}
                            onSubmitEditing={() => {
                                if (inputValue.trim()) onSearch(inputValue.trim())
                            }}
                            returnKeyType="search"
                            selectionColor={colors.burgundy}
                        />
                    </View>
                </View>
                {!loading && !error && (
                    <Text style={[styles.resultsCount, { color: colors.mutedLight }]}>
                        {academicMode
                            ? `${articles.length + evrimResults.length} sonuç bulundu`
                            : `${newsResults.length} haber bulundu`}
                    </Text>
                )}
            </View>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color={colors.burgundy} />
                    <Text style={[styles.statusText, { color: colors.muted }]}>Makaleler aranıyor...</Text>
                </View>
            ) : error ? (
                <View style={styles.centerBox}>
                    <Ionicons name="alert-circle-outline" size={32} color={colors.mutedLight} style={{ marginBottom: 12 }} />
                    <Text style={[styles.statusText, { color: colors.ink }]}>Hata</Text>
                    <Text style={[styles.statusSubText, { color: colors.muted }]}>{error}</Text>
                    <Pressable
                        onPress={() => {
                            setLoading(true)
                            setError(null)
                            searchArticles(query, sources, 1)
                                .then(setArticles)
                                .catch((e) => setError(e.message))
                                .finally(() => setLoading(false))
                        }}
                        style={[styles.retryBtn, { backgroundColor: colors.burgundy }]}
                    >
                        <Text style={styles.retryBtnText}>Tekrar Dene</Text>
                    </Pressable>
                </View>
            ) : (academicMode ? articles.length + evrimResults.length : newsResults.length) === 0 ? (
                <View style={styles.centerBox}>
                    <Ionicons name="search-outline" size={32} color={colors.mutedLight} style={{ marginBottom: 12 }} />
                    <Text style={[styles.statusText, { color: colors.ink }]}>Sonuç bulunamadı</Text>
                    <Text style={[styles.statusSubText, { color: colors.muted }]}>
                        Farklı anahtar kelimeler deneyin.
                    </Text>
                </View>
            ) : (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 10 }}>
                    {/* Haber sonuçları — yalnızca haber modunda */}
                    {!academicMode && newsResults.length > 0 && (
                        <View style={{ gap: 10, marginTop: 6 }}>
                            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1, color: '#C62828', textTransform: 'uppercase' as const }}>
                                HABER SONUÇLARI
                            </Text>
                            {newsResults.map((news) => {
                                const srcMeta = getNewsSourceMeta(news.source, [...NEWS_SOURCES, ...customSources])
                                const badgeColor = srcMeta?.color ?? FALLBACK_SOURCE_META.color
                                const badgeBg = srcMeta?.bg ?? FALLBACK_SOURCE_META.bg
                                return (
                                    <Pressable
                                        key={news.id}
                                        onPress={() => onOpenUrl(news.link, news.title)}
                                        style={[styles.card, { padding: 14, backgroundColor: colors.card, borderColor: colors.border }]}
                                    >
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                                                <Text style={[styles.badgeText, { color: badgeColor }]}>{srcMeta?.label ?? news.source}</Text>
                                            </View>
                                            <Text style={[styles.metaText, { color: colors.mutedLight }]}>{formatNewsDate(news.pubDate)}</Text>
                                        </View>
                                        <Text style={[styles.cardTitle, { fontSize: 15, color: colors.ink }]}>{news.title}</Text>
                                        {news.description ? (
                                            <Text style={[styles.cardAbstract, { color: colors.cardAbstract }]} numberOfLines={2}>
                                                {news.description}
                                            </Text>
                                        ) : null}
                                    </Pressable>
                                )
                            })}
                        </View>
                    )}

                    {/* Evrim Ağacı — yalnızca akademik modda */}
                    {academicMode && evrimResults.length > 0 && (
                        <View style={{ gap: 10, marginTop: 6 }}>
                            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1, color: '#2D8C3E', textTransform: 'uppercase' as const }}>
                                EVRİM AĞACI SONUÇLARI
                            </Text>
                            {evrimResults.map((ea) => (
                                <Pressable
                                    key={ea.id}
                                    onPress={() => onOpenUrl(ea.link, ea.title)}
                                    style={[styles.card, { padding: 14, backgroundColor: colors.card, borderColor: colors.border }]}
                                >
                                    <View style={{ marginBottom: 8 }}>
                                        <View style={[styles.badge, { backgroundColor: '#E8F5E9' }]}>
                                            <Text style={[styles.badgeText, { color: '#2D8C3E' }]}>Evrim Ağacı</Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.cardTitle, { fontSize: 15, color: colors.ink }]}>{ea.title}</Text>
                                    {ea.description ? (
                                        <Text style={[styles.cardAbstract, { color: colors.cardAbstract }]} numberOfLines={2}>
                                            {ea.description}
                                        </Text>
                                    ) : null}
                                    <View style={[styles.row, { marginTop: 6 }]}>
                                        <Text style={[styles.metaText, { color: colors.muted }]}>{ea.category}</Text>
                                        <Text style={[styles.metaDot, { color: colors.inputBorder }]}>·</Text>
                                        <Text style={[styles.metaText, { color: colors.muted }]}>{formatEvrimDate(ea.pubDate)}</Text>
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    )}

                    {/* Academic Results */}
                    {academicMode && articles.length > 0 && evrimResults.length > 0 && (
                        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1, color: colors.mutedLight, textTransform: 'uppercase' as const, marginTop: 6 }}>
                            AKADEMİK MAKALELER
                        </Text>
                    )}
                    {academicMode && articles.map((article) => (
                        <ArticleCard
                            key={article.id}
                            article={article}
                            onPress={() => onArticle(article)}
                            colors={colors}
                        />
                    ))}
                    {academicMode && hasMore && (
                        <Pressable
                            onPress={loadMore}
                            disabled={loadingMore}
                            style={[styles.loadMoreBtn, { borderColor: colors.burgundy, opacity: loadingMore ? 0.6 : 1 }]}
                        >
                            {loadingMore ? (
                                <ActivityIndicator size="small" color={colors.burgundy} />
                            ) : (
                                <Text style={[styles.loadMoreText, { color: colors.burgundy }]}>
                                    Daha Fazla Göster
                                </Text>
                            )}
                        </Pressable>
                    )}
                    <View style={{ height: 20 }} />
                </ScrollView>
            )}
        </View>
    )
}

// ─── Screen 3: Detail ────────────────────────────────────────────────────────

function DetailScreen({
    article,
    onBack,
    onOpenUrl,
    colors,
}: {
    article: Article
    onBack: () => void
    onOpenUrl: (url: string, title: string) => void
    colors: ColorScheme
}) {
    const { engine, style, apiKey } = useSettings()
    const { isSaved, toggleSave, updateTranslation } = useSavedArticles()
    const { downloadArticle, isDownloaded } = useDownloads()

    // ── Translation state ──
    const [lang, setLang] = useState<Lang>('en') // starts EN, auto-translates to TR
    const [titleTr, setTitleTr] = useState<string | null>(null)
    const [abstractTr, setAbstractTr] = useState<string | null>(null)
    const [translating, setTranslating] = useState(false)
    const [translateError, setTranslateError] = useState<string | null>(null)
    const [downloading, setDownloading] = useState(false)

    // ── Summary state ──
    const [summary, setSummary] = useState<string | null>(null)
    const [summarizing, setSummarizing] = useState(false)
    const [summaryError, setSummaryError] = useState<string | null>(null)
    const [summaryExpanded, setSummaryExpanded] = useState(true)

    const authorsStr = Array.isArray(article.authors) ? article.authors.join(', ') : String(article.authors)

    // ── Auto-translate on mount ──
    useEffect(() => {
        let cancelled = false
        setTranslating(true)
        setTranslateError(null)

        const opts = { style, engine, apiKey: apiKey || undefined }

        Promise.all([
            translateText(article.title, opts),
            translateText(article.abstract, opts),
        ])
            .then(([tTitle, tAbstract]) => {
                if (!cancelled) {
                    setTitleTr(tTitle)
                    setAbstractTr(tAbstract)
                    setLang('tr')
                    // Update translation cache if article is already saved
                    if (isSaved(article.id)) {
                        updateTranslation(article.id, tTitle, tAbstract)
                    }
                }
            })
            .catch((err) => {
                if (!cancelled) setTranslateError(err.message || 'Çeviri başarısız')
            })
            .finally(() => {
                if (!cancelled) setTranslating(false)
            })

        return () => {
            cancelled = true
        }
    }, [article.id])

    // ── Current display values ──
    const displayTitle = lang === 'tr' && titleTr ? titleTr : article.title
    const displayAbstract = lang === 'tr' && abstractTr ? abstractTr : article.abstract

    const switchLang = () => {
        if (lang === 'en' && !titleTr) {
            // Translation hasn't completed yet
            return
        }
        setLang((l) => (l === 'tr' ? 'en' : 'tr'))
    }

    const handleSummarize = () => {
        if (engine === 'mymemory') {
            Alert.alert(
                'Motor Uyumsuz',
                "Özetleme için Ayarlar'dan Anthropic veya OpenAI seç.",
            )
            return
        }
        setSummarizing(true)
        setSummaryError(null)
        summarizeText(article.abstract, { engine, apiKey: apiKey || undefined })
            .then((s) => {
                setSummary(s)
                setSummaryExpanded(true)
            })
            .catch((err) => setSummaryError(err.message || 'Özetleme başarısız'))
            .finally(() => setSummarizing(false))
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.cream }}>
            <View style={[styles.navBar, { borderBottomColor: colors.border, backgroundColor: colors.cream }]}>
                <View style={styles.row}>
                    <Pressable
                        onPress={onBack}
                        hitSlop={8}
                        accessibilityLabel="Geri"
                        accessibilityRole="button"
                        style={{ padding: 6 }}
                    >
                        <Text style={[styles.backArrow, { color: colors.burgundy }]}>←</Text>
                    </Pressable>
                    <SourceBadge source={article.source} />
                    <Text style={[styles.journalText, { color: colors.mutedLight }]}>{article.journal}</Text>
                    <Pressable
                        onPress={() => toggleSave(article, titleTr || undefined, abstractTr || undefined)}
                        hitSlop={8}
                        accessibilityLabel={isSaved(article.id) ? 'Kaydedildi, kaldır' : 'Makaleyi kaydet'}
                        accessibilityRole="button"
                        style={{ marginLeft: 8, padding: 4 }}
                    >
                        <Ionicons
                            name={isSaved(article.id) ? 'bookmark' : 'bookmark-outline'}
                            size={19}
                            color={colors.burgundy}
                        />
                    </Pressable>
                    {article.url ? (
                        <Pressable
                            onPress={() => {
                                if (downloading || isDownloaded(article.id)) return
                                setDownloading(true)
                                downloadArticle({
                                    id: article.id,
                                    source: article.source,
                                    title: article.title,
                                    description: article.abstract,
                                    link: article.url,
                                })
                                    .catch((err) => Alert.alert('İndirilemedi', err.message || 'Bir hata oluştu.'))
                                    .finally(() => setDownloading(false))
                            }}
                            hitSlop={8}
                            accessibilityLabel={
                                isDownloaded(article.id) ? 'İndirildi' : downloading ? 'İndiriliyor' : 'Çevrimdışı için indir'
                            }
                            accessibilityRole="button"
                            style={{ marginLeft: 4, padding: 4 }}
                            disabled={downloading}
                        >
                            <Ionicons
                                name={isDownloaded(article.id) ? 'checkmark-circle' : downloading ? 'ellipsis-horizontal' : 'download-outline'}
                                size={19}
                                color={downloading ? colors.mutedLight : colors.burgundy}
                            />
                        </Pressable>
                    ) : null}
                </View>
            </View>

            <ScrollView style={{ flex: 1 }}>
                <View style={styles.detailBody}>
                    {/* Title */}
                    {translating ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                            <ActivityIndicator size="small" color={colors.burgundy} />
                            <Text style={[styles.statusSubText, { color: colors.muted }]}>Çevriliyor...</Text>
                        </View>
                    ) : null}
                    <Text style={[styles.detailTitle, { color: colors.ink }]}>{displayTitle}</Text>
                    {translateError && (
                        <Text style={[styles.errorText, { color: '#C0392B' }]}>Çeviri hatası: {translateError}</Text>
                    )}
                    <Text style={[styles.detailAuthors, { color: colors.muted }]}>{authorsStr}</Text>
                    <Text style={[styles.detailYear, { color: colors.mutedLight }]}>{article.year}</Text>
                    <View style={[styles.divider, { backgroundColor: colors.inputBorder }]} />

                    {/* Abstract */}
                    <View style={[styles.abstractBox, { backgroundColor: colors.abstractBg, borderColor: colors.border }]}>
                        <Text style={[styles.abstractLabel, { color: colors.burgundy }]}>
                            {lang === 'tr' ? 'Özet' : 'Abstract'}
                        </Text>
                        <Text style={[styles.abstractText, { color: colors.abstractText }]}>
                            {displayAbstract}
                        </Text>
                    </View>

                    {/* Summarize button */}
                    <Pressable
                        onPress={handleSummarize}
                        disabled={summarizing}
                        style={[
                            styles.summarizeBtn,
                            {
                                backgroundColor: colors.burgundy,
                                opacity: summarizing ? 0.6 : 1,
                            },
                        ]}
                    >
                        {summarizing ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.summarizeBtnText}>
                                {summary ? 'Tekrar Özetle' : '📝 Özetle'}
                            </Text>
                        )}
                    </Pressable>

                    {/* Summary result */}
                    {summaryError && (
                        <Text style={[styles.errorText, { color: '#C0392B', marginTop: 12 }]}>
                            Özetleme hatası: {summaryError}
                        </Text>
                    )}
                    {summary && (
                        <View style={[styles.summaryCard, { backgroundColor: colors.abstractBg, borderColor: colors.border }]}>
                            <Pressable
                                onPress={() => setSummaryExpanded((v) => !v)}
                                style={styles.summaryHeader}
                            >
                                <Text style={[styles.abstractLabel, { color: colors.burgundy, marginBottom: 0 }]}>
                                    Sadeleştirilmiş Özet
                                </Text>
                                <Ionicons
                                    name={summaryExpanded ? 'chevron-up' : 'chevron-down'}
                                    size={15}
                                    color={colors.muted}
                                />
                            </Pressable>
                            {summaryExpanded && (
                                <Text style={[styles.summaryText, { color: colors.abstractText }]}>
                                    {summary}
                                </Text>
                            )}
                        </View>
                    )}

                    {/* URL link — opens WebView */}
                    {article.url ? (
                        <Pressable
                            onPress={() => onOpenUrl(article.url, article.title)}
                            accessibilityLabel="Orijinal makaleyi görüntüle"
                            accessibilityRole="link"
                            style={{ marginTop: 20 }}
                        >
                            <Text style={[styles.linkText, { color: colors.burgundy }]}>
                                Orijinal makaleyi görüntüle →
                            </Text>
                        </Pressable>
                    ) : null}
                </View>
            </ScrollView>

            {/* Language toggle FAB */}
            <Pressable
                onPress={switchLang}
                disabled={translating && lang === 'en'}
                accessibilityLabel={lang === 'tr' ? 'İngilizce göster' : 'Türkçe göster'}
                accessibilityRole="button"
                accessibilityState={{ disabled: translating && lang === 'en' }}
                style={[styles.langToggle, { opacity: translating && lang === 'en' ? 0.5 : 1 }]}
            >
                <Text style={{ fontSize: 14 }}>{lang === 'tr' ? '🇬🇧' : '🇹🇷'}</Text>
                <Text style={styles.langToggleText}>{lang === 'tr' ? 'English' : 'Türkçe'}</Text>
            </Pressable>
        </View>
    )
}

// ─── Bottom Tab Bar ──────────────────────────────────────────────────────────

function TabBar({
    active,
    onTab,
    visibleTabs,
    colors,
}: {
    active: TabId
    onTab: (tab: TabId) => void
    visibleTabs: TabId[]
    colors: ColorScheme
}) {
    const HN_ORANGE = '#E65100'
    const NEWS_RED = '#C62828'
    const EA_GREEN = '#2D8C3E'

    const allTabs: {
        id: TabId
        icon: keyof typeof Ionicons.glyphMap
        activeIcon: keyof typeof Ionicons.glyphMap
        label: string
        color?: string
    }[] = [
        { id: 'discover', icon: 'library-outline', activeIcon: 'library', label: 'Keşfet', color: colors.burgundy },
        { id: 'evrimagaci', icon: 'telescope-outline', activeIcon: 'telescope', label: 'Bilim', color: EA_GREEN },
        { id: 'hn', icon: 'logo-hackernews', activeIcon: 'logo-hackernews', label: 'Teknoloji', color: HN_ORANGE },
        { id: 'news', icon: 'newspaper-outline', activeIcon: 'newspaper', label: 'Gündem', color: NEWS_RED },
    ]

    // Ayarlar'dan kapatılan kategorileri gizle. Keşfet sabit olduğu için her
    // zaman en az bir sekme görünür.
    const allVisible = visibleTabs.length === 0
    const tabs = allVisible ? allTabs : allTabs.filter((t) => visibleTabs.includes(t.id))

    return (
        <View style={[styles.tabBar, { borderTopColor: colors.border, backgroundColor: colors.cream }]}>
            {tabs.map((tab) => {
                const isActive = active === tab.id
                const tint = isActive ? (tab.color || colors.burgundy) : colors.mutedLight
                return (
                    <Pressable
                        key={tab.id}
                        onPress={() => onTab(tab.id)}
                        accessibilityLabel={tab.label}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: isActive }}
                        style={styles.tabItem}
                        hitSlop={{ top: 6, bottom: 6 }}
                    >
                        <Ionicons
                            name={isActive ? tab.activeIcon : tab.icon}
                            size={22}
                            color={tint}
                        />
                        <Text
                            style={[
                                styles.tabLabel,
                                {
                                    color: tint,
                                    fontFamily: isActive ? SANS_SEMIBOLD : SANS,
                                },
                            ]}
                        >
                            {tab.label}
                        </Text>
                    </Pressable>
                )
            })}
        </View>
    )
}

// ─── Inner App (needs SettingsContext) ────────────────────────────────────────

function AppInner() {
    const [fontsLoaded] = useFonts({
        SourceSerif4_400Regular,
        SourceSerif4_400Regular_Italic,
        SourceSerif4_600SemiBold,
        SourceSerif4_700Bold,
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
    })

    const { darkMode, ready, hasCompletedOnboarding, setSelectedTopics, completeOnboarding, hiddenTabs } = useSettings()
    const colors = darkMode ? darkColors : lightColors

    const [screen, setScreen] = useState<Screen>(HOME_SCREEN)
    const [query, setQuery] = useState('')
    const [article, setArticle] = useState<Article | null>(null)
    const [hnItem, setHnItem] = useState<HNItem | null>(null)
    const [webviewUrl, setWebviewUrl] = useState('')
    const [webviewTitle, setWebviewTitle] = useState('')

    // Makale/okucyucu ekranlarının geldiği sekme. Kayıtlılar'dan açılan bir
    // makale kayıtlılara, Keşfet'ten açılan makale keşfete dönmeli. Eski
    // prevTab/`prevTab === 'saved'` ifadesi bu ikisini birbirine karıştırıyordu.
    const [detailOrigin, setDetailOrigin] = useState<Screen>('results')

    // Arama sonuçlarının hangi sekmeden açıldığı — geri dönüş oraya yapılır.
    const [searchOrigin, setSearchOrigin] = useState<Screen>('discover')
    // Gündem araması yalnızca haber getirir; Keşfet araması yalnızca akademik.
    const [searchMode, setSearchMode] = useState<'academic' | 'news'>('academic')

    // Hamburger menünün açıldığı ekran — geri dönüş buraya yapılır.
    const [menuOrigin, setMenuOrigin] = useState<Screen>(HOME_SCREEN)
    const [menuOpen, setMenuOpen] = useState(false)

    const [downloadedArticle, setDownloadedArticle] = useState<DownloadedArticle | null>(null)
    const [prevScreen, setPrevScreen] = useState<Screen>(HOME_SCREEN)

    const handleBack = useCallback(() => {
        if (screen === 'webview') setScreen(prevScreen)
        else if (screen === 'detail') setScreen(detailOrigin)
        else if (screen === 'settings' || screen === 'saved' || screen === 'profile') setScreen(menuOrigin)
        else if (screen === 'hnReader') setScreen('hn')
        else if (screen === 'results') setScreen(searchOrigin)
        else setScreen(HOME_SCREEN)
    }, [screen, detailOrigin, menuOrigin, prevScreen])

    useEffect(() => {
        const onBackPress = () => {
            // Menü açıkken geri tuşu önce menüyü kapatsın, ekran değiştirmesin
            if (menuOpen) {
                setMenuOpen(false)
                return true
            }
            if (screen === HOME_SCREEN) {
                return false // Allow Android to exit app
            }
            handleBack()
            return true // Prevent exit
        }
        const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress)
        return () => sub.remove()
    }, [screen, handleBack, menuOpen])

    // NOT: Bu hook, aşağıdaki `if (!fontsLoaded || !ready) return null` ve
    // `if (!hasCompletedOnboarding) return (...)` erken çıkışlarından ÖNCE
    // olmalı. Erken çıkıştan sonra bırakılırsa React "Rendered more hooks
    // than during the previous render" hatası verir: ilk render'da hook
    // hiç çalışmayıp, `ready` true olduktan sonra çalışmaya başlar.
    const visibleTabs = useMemo<TabId[]>(
        () => TAB_SCREENS.filter((t) => !hiddenTabs.includes(t)),
        [hiddenTabs],
    )

    if (!fontsLoaded || !ready) return null

    const handleSearch = (q: string, mode: 'academic' | 'news' = 'academic') => {
        setQuery(q)
        setSearchOrigin(screen)
        setSearchMode(mode)
        setScreen('results')
    }

    const handleArticle = (a: Article) => {
        setArticle(a)
        setDetailOrigin(screen === 'saved' ? 'saved' : 'results')
        setScreen('detail')
    }

    const openMenu = () => {
        setMenuOrigin(screen)
        setMenuOpen(true)
    }

    const handleHNItem = (item: HNItem) => {
        setHnItem(item)
        setScreen('hnReader')
    }

    const handleOpenUrl = (url: string, title: string) => {
        setPrevScreen(screen)
        setWebviewUrl(url)
        setWebviewTitle(title)
        setScreen('webview')
    }

    const handleOfflineReader = (item: DownloadedArticle) => {
        setDownloadedArticle(item)
        setScreen('offlineReader')
    }

    const handleTab = (tab: TabId) => {
        setScreen(tab)
    }

    // Hamburger menü öğeleri: Kayıtlılar, Ayarlar, Profil. Hepsi menünün
    // açıldığı ekrana döner (menuOrigin), sekme olmadıkları için alt barda
    // görünmezler.
    const openFromMenu = (target: Screen) => {
        setMenuOpen(false)
        setScreen(target)
    }

    // TypeScript `includes` ile değeri daraltmıyor, bu yüzden `screen` her
    // zaman `Screen` kalıyor. `showTab` doğruysa `screen` gerçekten bir sekme
    // olduğundan burada daraltma güvenli.
    const showTab = (TAB_SCREENS as readonly Screen[]).includes(screen)
    const activeTab: TabId = showTab ? (screen as TabId) : 'discover'

    if (!hasCompletedOnboarding) {
        return (
            <OnboardingScreen
                colors={colors}
                onComplete={(topics) => {
                    setSelectedTopics(topics)
                    completeOnboarding()
                }}
            />
        )
    }

    // Sekme ekranlarının her biri menü düğmesini kendi başlığına alıyor.
    const openMenuFromTab = () => openMenu()

    return (
        <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
                <StatusBar style={darkMode ? 'light' : 'dark'} />
                {screen === 'results' && (
                    <ResultsScreen
                        query={query}
                        onBack={handleBack}
                        onArticle={handleArticle}
                        onSearch={handleSearch}
                        onOpenUrl={handleOpenUrl}
                        colors={colors}
                        mode={searchMode}
                    />
                )}
                {screen === 'detail' && article && (
                    <DetailScreen article={article} onBack={handleBack} onOpenUrl={handleOpenUrl} colors={colors} />
                )}
                {screen === 'discover' && (
                    <DiscoverScreen
                        colors={colors}
                        onArticle={handleArticle}
                        onOpenSettings={() => { setScreen('settings') }}
                        onOpenMenu={openMenuFromTab}
                    />
                )}
                {screen === 'hn' && <HNScreen colors={colors} onItem={handleHNItem} onOpenMenu={openMenuFromTab} />}
                {screen === 'hnReader' && hnItem && (
                    <HNReaderScreen item={hnItem} onBack={handleBack} colors={colors} />
                )}
                {screen === 'evrimagaci' && (
                    <EvrimAgaciScreen colors={colors} onOpenUrl={handleOpenUrl} onOpenMenu={openMenuFromTab} />
                )}
                {screen === 'news' && (
                    <NewsScreen
                        colors={colors}
                        onOpenUrl={handleOpenUrl}
                        onSearch={handleSearch}
                        onOpenMenu={openMenuFromTab}
                    />
                )}
                {screen === 'webview' && webviewUrl && (
                    <ArticleWebViewScreen url={webviewUrl} title={webviewTitle} onBack={handleBack} colors={colors} />
                )}
                {screen === 'settings' && <SettingsScreen colors={colors} onBack={handleBack} />}
                {screen === 'saved' && <SavedScreen colors={colors} onArticle={handleArticle} onHNItem={handleHNItem} onOpenUrl={handleOpenUrl} onOfflineArticle={handleOfflineReader} />}
                {screen === 'profile' && <ProfileScreen colors={colors} onBack={handleBack} />}
                {screen === 'offlineReader' && downloadedArticle && (
                    <OfflineReaderScreen article={downloadedArticle} onBack={handleBack} colors={colors} />
                )}
                {showTab && <TabBar active={activeTab} onTab={handleTab} visibleTabs={visibleTabs} colors={colors} />}

                <HamburgerMenu
                    colors={colors}
                    open={menuOpen}
                    onClose={() => setMenuOpen(false)}
                    onSelect={openFromMenu}
                />
            </SafeAreaView>
        </SafeAreaProvider>
    )
}

// ─── Root ────────────────────────────────────────────────────────────────────

export default function App() {
    return (
        <SettingsProvider>
            <CustomSourcesProvider>
                <SavedArticlesProvider>
                    <DownloadsProvider>
                        <AppInner />
                    </DownloadsProvider>
                </SavedArticlesProvider>
            </CustomSourcesProvider>
        </SettingsProvider>
    )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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
    card: {
        borderWidth: 1,
        borderRadius: 12,
    },
    cardTitle: {
        fontFamily: SERIF_SEMIBOLD,
        lineHeight: 22,
        marginBottom: 5,
    },
    metaText: { fontFamily: SANS, fontSize: 12 },
    metaDot: { fontSize: 12 },
    cardAbstract: {
        fontFamily: SANS,
        fontSize: 13,
        lineHeight: 20,
    },
    navBar: {
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 14,
        borderBottomWidth: 1,
        gap: 14,
    },
    backArrow: { fontSize: 18 },
    queryPill: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 14,
        height: 40,
        justifyContent: 'center',
    },
    queryPillText: { 
        fontFamily: SANS, 
        fontSize: 14,
        padding: 0,
        margin: 0,
        textAlignVertical: 'center',
    },
    resultsCount: { fontFamily: SANS, fontSize: 12 },
    journalText: { marginLeft: 'auto', fontFamily: SANS, fontSize: 11 },
    centerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    statusText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 16,
        marginTop: 12,
        textAlign: 'center',
    },
    statusSubText: {
        fontFamily: SANS,
        fontSize: 13,
        marginTop: 6,
        textAlign: 'center',
        lineHeight: 20,
    },
    retryBtn: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryBtnText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 13,
        color: '#FFFFFF',
    },
    detailBody: {
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: 100,
        maxWidth: 600,
        alignSelf: 'center',
        width: '100%',
    },
    detailTitle: {
        fontFamily: SERIF_BOLD,
        fontSize: 22,
        lineHeight: 30,
        marginBottom: 14,
    },
    detailAuthors: { fontFamily: SANS, fontSize: 13, marginBottom: 4 },
    detailYear: { fontFamily: SANS, fontSize: 12, marginBottom: 22 },
    divider: { height: 1, marginBottom: 24 },
    abstractBox: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
    },
    abstractLabel: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 11,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    abstractText: {
        fontFamily: SERIF_ITALIC,
        fontSize: 14,
        lineHeight: 24,
    },
    errorText: {
        fontFamily: SANS,
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 10,
    },
    summarizeBtn: {
        alignSelf: 'flex-start',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        marginBottom: 4,
    },
    summarizeBtnText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 13,
        color: '#FFFFFF',
    },
    summaryCard: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 16,
        marginTop: 16,
    },
    summaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryText: {
        fontFamily: SANS,
        fontSize: 14,
        lineHeight: 24,
        marginTop: 10,
    },
    linkText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 13,
        textDecorationLine: 'underline',
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
    tabBar: {
        flexDirection: 'row',
        borderTopWidth: 1,
        paddingBottom: 4,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        gap: 3,
    },
    tabLabel: { fontSize: 10 },
    loadMoreBtn: {
        borderWidth: 1.5,
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 6,
    },
    loadMoreText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 13,
        letterSpacing: 0.3,
    },
})
