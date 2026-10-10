import { useState, useEffect, useMemo } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { MenuButton } from './HamburgerMenu'
import { searchArticles, type Article } from '../api/client'
import { topicQuery } from '../api/topics'
import { useSettings } from '../store/SettingsContext'
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

interface TopicSection {
    label: string
    articles: Article[]
    loading: boolean
    error: string | null
}

function SourceBadge({ source }: { source: string }) {
    const key = source.toLowerCase().replace(/\s/g, '') as keyof typeof SOURCE_META
    const meta = SOURCE_META[key] ?? { label: source, color: '#6B6560', bg: '#F5F0EA' }
    return (
        <View style={[s.badge, { backgroundColor: meta.bg }]}>
            <Text style={[s.badgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
    )
}

function ArticleCard({ article, onPress, colors }: { article: Article; onPress: () => void; colors: ColorScheme }) {
    const [pressed, setPressed] = useState(false)
    const authors = Array.isArray(article.authors) ? article.authors.join(', ') : String(article.authors ?? '')
    return (
        <Pressable
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            onPress={onPress}
            style={[
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
}

// Sekme değişiminde veriyi korumak için modül düzeyinde hafif bir cache:
// kullanıcı makalelere bakıp Gündem'e gidip geri döndüğünde her şeyi
// yeniden çekmiyor. 5 dakika TTL.
let cache: { key: string; time: number; sections: TopicSection[] } | null = null
const TTL = 5 * 60 * 1000

export default function DiscoverScreen({
    colors,
    onArticle,
    onOpenTopics,
    onOpenMenu,
}: {
    colors: ColorScheme
    onArticle: (a: Article) => void
    onOpenTopics: () => void
    onOpenMenu?: () => void
}) {
    const { selectedTopics, sources } = useSettings()
    const [sections, setSections] = useState<TopicSection[]>([])
    const [loading, setLoading] = useState(true)

    const topicKey = selectedTopics.join('|')

    useEffect(() => {
        if (topicKey === '') {
            setSections([])
            setLoading(false)
            return
        }

        // Aynı konu + kaynak kümesi kısa süre önce yüklendiyse tekrar çekme
        const cacheKey = `${topicKey}|${sources.join(',')}`
        if (cache && cache.key === cacheKey && Date.now() - cache.time < TTL) {
            setSections(cache.sections)
            setLoading(false)
            return
        }

        setLoading(true)
        setSections(selectedTopics.slice(0, MAX_AUTO_TOPICS).map((label) => ({ label, articles: [], loading: true, error: null })))

        // İlk MAX_AUTO_TOPICS konu için paralel arama. Sonraki konular
        // "Daha Fazla" ile açılıyor ki başlangıç ekranı 1.5 saniye sürmesin.
        selectedTopics.slice(0, MAX_AUTO_TOPICS).forEach((label) => {
            searchArticles(topicQuery(label), sources, 1)
                .then((articles) => {
                    setSections((prev) => prev.map((sec) => (sec.label === label ? { ...sec, articles, loading: false } : sec)))
                })
                .catch((err) => {
                    setSections((prev) =>
                        prev.map((sec) =>
                            sec.label === label
                                ? { ...sec, loading: false, error: err?.message || 'Yüklenemedi' }
                                : sec,
                        ),
                    )
                })
        })

        setLoading(false)
        cache = { key: cacheKey, time: Date.now(), sections: [] }
    }, [topicKey, sources, selectedTopics])

    const hasAny = sections.some((sec) => sec.loading || sec.articles.length > 0)

    if (selectedTopics.length === 0) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.cream }}>
                <Header colors={colors} onOpenMenu={onOpenMenu ?? (() => {})} />
                <View style={s.emptyBox}>
                    <Ionicons name="compass-outline" size={44} color={colors.mutedLight} />
                    <Text style={[s.emptyTitle, { color: colors.ink }]}>Henüz ilgi alanı seçmedin</Text>
                    <Text style={[s.emptyText, { color: colors.muted }]}>
                        Ayarlar'dan konu seçtiğinde sana özel makale akışı oluşur.
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

    return (
        <View style={{ flex: 1, backgroundColor: colors.cream }}>
            <Header colors={colors} onOpenMenu={onOpenMenu ?? (() => {})} />

            <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body}>
                <Text style={[s.intro, { color: colors.mutedLight }]}>
                    {selectedTopics.length > MAX_AUTO_TOPICS
                        ? `${MAX_AUTO_TOPICS} / ${selectedTopics.length} konudan öneriler`
                        : 'İlgi alanlarına göre akademik makaleler'}
                </Text>

                {sections.map((sec) => (
                    <View key={sec.label} style={s.section}>
                        <Text style={[s.sectionTitle, { color: colors.burgundy }]}>{sec.label}</Text>

                        {sec.loading ? (
                            <ActivityIndicator size="small" color={colors.burgundy} />
                        ) : sec.error ? (
                            <Text style={[s.errorText, { color: colors.muted }]}>{sec.error}</Text>
                        ) : sec.articles.length === 0 ? (
                            <Text style={[s.emptyTextSmall, { color: colors.mutedLight }]}>Bu konuda sonuç bulunamadı</Text>
                        ) : (
                            <View style={{ gap: 10 }}>
                                {sec.articles.map((article, i) => (
                                    <ArticleCard
                                        key={`${sec.label}-${article.id ?? i}`}
                                        article={article}
                                        onPress={() => onArticle(article)}
                                        colors={colors}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                ))}

                {!hasAny && (
                    <View style={s.emptyBox}>
                        <Ionicons name="search-outline" size={34} color={colors.mutedLight} />
                        <Text style={[s.emptyTitle, { color: colors.ink }]}>Sonuç bulunamadı</Text>
                        <Text style={[s.emptyText, { color: colors.muted }]}>
                            Filtreleri genişletmek için ayarlardan akademik kaynakları açabilirsin.
                        </Text>
                    </View>
                )}
                <View style={{ height: 28 }} />
            </ScrollView>
        </View>
    )
}

// Keşfet ekranının başlığı. Hamburger menü düğmesini App.tsx render ediyor
// (ekranların hepsinde aynı yerde) — bu yüzden burada yalnızca metin var.
function Header({ colors, onOpenMenu }: { colors: ColorScheme; onOpenMenu: () => void }) {
    return (
        <View style={[s.header, { borderBottomColor: colors.border }]}>
            <View style={s.headerRow}>
                <View style={{ flex: 1 }}>
                    <Text style={[s.title, { color: colors.ink }]}>Makaleler</Text>
                    <Text style={[s.subtitle, { color: colors.mutedLight }]}>İlgi alanlarına göre keşfet</Text>
                </View>
                <MenuButton onPress={onOpenMenu} colors={colors} />
            </View>
        </View>
    )
}

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
