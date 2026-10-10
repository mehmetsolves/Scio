import { useState, useEffect, useCallback } from 'react'
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
import { fetchAllNews, filterNews, formatNewsDate, getNewsSourceMeta, type NewsArticle } from './src/api/news'
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

// ─── Types ───────────────────────────────────────────────────────────────────

type Screen = 'results' | 'detail' | 'settings' | 'saved' | 'profile' | 'hn' | 'hnReader' | 'webview' | 'evrimagaci' | 'news' | 'offlineReader'
type Lang = 'tr' | 'en'

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
}: {
    query: string
    onBack: () => void
    onArticle: (a: Article) => void
    onSearch: (q: string) => void
    onOpenUrl: (url: string, title: string) => void
    colors: ColorScheme
}) {
    const { sources } = useSettings()
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
        searchArticles(query, sources, 1)
            .then((data) => {
                if (!cancelled) {
                    setArticles(data)
                    if (data.length === 0) setHasMore(false)
                }
            })
            .catch((err) => {
                if (!cancelled) setError(err.message || 'Bir hata oluştu')
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [query, sources])

    // Also search Evrim Ağacı
    useEffect(() => {
        searchEvrimAgaci(query)
            .then(setEvrimResults)
            .catch(() => setEvrimResults([]))
    }, [query])

    // Also search news
    useEffect(() => {
        fetchAllNews()
            .then((all) => setNewsResults(filterNews(all, query)))
            .catch(() => setNewsResults([]))
    }, [query])

    const loadMore = () => {
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
                        {articles.length + evrimResults.length + newsResults.length} sonuç bulundu
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
            ) : articles.length === 0 && evrimResults.length === 0 && newsResults.length === 0 ? (
                <View style={styles.centerBox}>
                    <Ionicons name="search-outline" size={32} color={colors.mutedLight} style={{ marginBottom: 12 }} />
                    <Text style={[styles.statusText, { color: colors.ink }]}>Sonuç bulunamadı</Text>
                    <Text style={[styles.statusSubText, { color: colors.muted }]}>
                        Farklı anahtar kelimeler deneyin.
                    </Text>
                </View>
            ) : (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 10 }}>
                    {/* News Results */}
                    {newsResults.length > 0 && (
                        <View style={{ gap: 10, marginTop: 6 }}>
                            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1, color: '#C62828', textTransform: 'uppercase' as const }}>
                                HABER SONUÇLARI
                            </Text>
                            {newsResults.map((news) => {
                                const srcMeta = getNewsSourceMeta(news.source)
                                return (
                                    <Pressable
                                        key={news.id}
                                        onPress={() => onOpenUrl(news.link, news.title)}
                                        style={[styles.card, { padding: 14, backgroundColor: colors.card, borderColor: colors.border }]}
                                    >
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <View style={[styles.badge, { backgroundColor: srcMeta.bg }]}>
                                                <Text style={[styles.badgeText, { color: srcMeta.color }]}>{srcMeta.label}</Text>
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

                    {/* Evrim Ağacı Results */}
                    {evrimResults.length > 0 && (
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
                    {articles.length > 0 && evrimResults.length > 0 && (
                        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1, color: colors.mutedLight, textTransform: 'uppercase' as const, marginTop: 6 }}>
                            AKADEMİK MAKALELER
                        </Text>
                    )}
                    {articles.map((article) => (
                        <ArticleCard
                            key={article.id}
                            article={article}
                            onPress={() => onArticle(article)}
                            colors={colors}
                        />
                    ))}
                    {hasMore && (
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

type TabId = 'news' | 'hn' | 'evrimagaci' | 'saved'

function TabBar({
    active,
    onTab,
    colors,
}: {
    active: TabId
    onTab: (tab: TabId) => void
    colors: ColorScheme
}) {
    const HN_ORANGE = '#E65100'
    const NEWS_RED = '#C62828'
    const EA_GREEN = '#2D8C3E'

    const tabs: {
        id: TabId
        icon: keyof typeof Ionicons.glyphMap
        activeIcon: keyof typeof Ionicons.glyphMap
        label: string
        color?: string
    }[] = [
        { id: 'news', icon: 'newspaper-outline', activeIcon: 'newspaper', label: 'Gündem', color: NEWS_RED },
        { id: 'hn', icon: 'logo-hackernews', activeIcon: 'logo-hackernews', label: 'HN', color: HN_ORANGE },
        { id: 'evrimagaci', icon: 'telescope-outline', activeIcon: 'telescope', label: 'Bilim', color: EA_GREEN },
        { id: 'saved', icon: 'bookmark-outline', activeIcon: 'bookmark', label: 'Kayıtlı' },
    ]

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

    const { darkMode, ready, hasCompletedOnboarding, setSelectedTopics, completeOnboarding } = useSettings()
    const colors = darkMode ? darkColors : lightColors

    const [screen, setScreen] = useState<Screen>('news')
    const [query, setQuery] = useState('')
    const [article, setArticle] = useState<Article | null>(null)
    const [hnItem, setHnItem] = useState<HNItem | null>(null)
    const [webviewUrl, setWebviewUrl] = useState('')
    const [webviewTitle, setWebviewTitle] = useState('')
    const [prevTab, setPrevTab] = useState<TabId>('news')
    const [downloadedArticle, setDownloadedArticle] = useState<DownloadedArticle | null>(null)

    const [prevScreen, setPrevScreen] = useState<Screen>('news')

    const handleBack = useCallback(() => {
        if (screen === 'detail') setScreen(prevTab === 'saved' ? 'saved' : 'results')
        else if (screen === 'results') setScreen('news')
        else if (screen === 'hnReader') setScreen('hn')
        else if (screen === 'webview') setScreen(prevScreen)
        else if (screen === 'offlineReader') setScreen('saved')
        else if (screen === 'settings') setScreen(prevTab)
        else setScreen('news')
    }, [screen, prevTab, prevScreen])

    useEffect(() => {
        const onBackPress = () => {
            if (screen === 'news') {
                return false // Allow Android to exit app
            }
            handleBack()
            return true // Prevent exit
        }
        const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress)
        return () => sub.remove()
    }, [screen, handleBack])

    if (!fontsLoaded || !ready) return null

    const handleSearch = (q: string) => {
        setQuery(q)
        setScreen('results')
    }

    const handleArticle = (a: Article) => {
        setArticle(a)
        setScreen('detail')
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
        setPrevTab(tab)
        setScreen(tab)
    }

    const showTab = screen === 'news' || screen === 'hn' || screen === 'evrimagaci' || screen === 'saved'

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

    const activeTab: TabId =
        screen === 'hn' ? 'hn'
        : screen === 'evrimagaci' ? 'evrimagaci'
        : screen === 'saved' ? 'saved'
        : 'news'

    return (
        <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={['top', 'bottom']}>
                <StatusBar style={darkMode ? 'light' : 'dark'} />
                {screen === 'results' && (
                    <ResultsScreen query={query} onBack={handleBack} onArticle={handleArticle} onSearch={handleSearch} onOpenUrl={handleOpenUrl} colors={colors} />
                )}
                {screen === 'detail' && article && (
                    <DetailScreen article={article} onBack={handleBack} onOpenUrl={handleOpenUrl} colors={colors} />
                )}
                {screen === 'hn' && <HNScreen colors={colors} onItem={handleHNItem} />}
                {screen === 'hnReader' && hnItem && (
                    <HNReaderScreen item={hnItem} onBack={handleBack} colors={colors} />
                )}
                {screen === 'evrimagaci' && <EvrimAgaciScreen colors={colors} onOpenUrl={handleOpenUrl} />}
                {screen === 'news' && (
                    <NewsScreen
                        colors={colors}
                        onOpenUrl={handleOpenUrl}
                        onSearch={handleSearch}
                        onOpenSettings={() => { setPrevTab('news'); setScreen('settings') }}
                        onOpenProfile={() => { setPrevTab('news'); setScreen('profile') }}
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
                {showTab && <TabBar active={activeTab} onTab={handleTab} colors={colors} />}
            </SafeAreaView>
        </SafeAreaProvider>
    )
}

// ─── Root ────────────────────────────────────────────────────────────────────

export default function App() {
    return (
        <SettingsProvider>
            <SavedArticlesProvider>
                <DownloadsProvider>
                    <AppInner />
                </DownloadsProvider>
            </SavedArticlesProvider>
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
    homeHeader: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 28,
        borderBottomWidth: 1,
    },
    brand: {
        fontFamily: SERIF_ITALIC,
        fontSize: 13,
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    h1: {
        fontFamily: SERIF_BOLD,
        fontSize: 26,
        marginBottom: 20,
        lineHeight: 32,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 10,
        paddingHorizontal: 14,
    },
    searchIcon: { fontSize: 15, marginRight: 8 },
    searchInput: {
        flex: 1,
        paddingVertical: 13,
        fontFamily: SANS,
        fontSize: 14,
    },
    pill: {
        flexShrink: 0,
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 5,
        marginRight: 8,
    },
    pillText: { fontFamily: SANS, fontSize: 12 },
    sectionLabel: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 11,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 14,
    },
    hintText: {
        fontFamily: SANS,
        fontSize: 14,
        lineHeight: 22,
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
    tabIcon: { fontSize: 18 },
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
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E65100',
    },
    hnPreviewCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    hnPreviewTitle: {
        fontFamily: SERIF_SEMIBOLD,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 3,
    },
    hnPreviewMeta: {
        fontFamily: SANS,
        fontSize: 11,
    },
})
