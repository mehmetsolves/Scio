import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useSettings } from '../store/SettingsContext'
import { useSavedArticles } from '../store/SavedArticlesContext'
import type { ColorScheme } from '../theme/colors'

const SERIF_BOLD = 'SourceSerif4_700Bold'
const SERIF_ITALIC = 'SourceSerif4_400Regular_Italic'
const SANS = 'Inter_400Regular'
const SANS_MEDIUM = 'Inter_500Medium'
const SANS_SEMIBOLD = 'Inter_600SemiBold'

const ENGINE_LABELS: Record<string, string> = {
    anthropic: 'Anthropic Claude',
    openai: 'OpenAI GPT',
    groq: 'Groq (Llama)',
    gemini: 'Google Gemini',
    mymemory: 'MyMemory (Ücretsiz)',
}

const STYLE_LABELS: Record<string, string> = {
    academic: 'Akademik',
    simple: 'Sade',
}

export default function ProfileScreen({ colors, onBack }: { colors: ColorScheme; onBack?: () => void }) {
    const { engine, style, sources } = useSettings()
    const { savedArticles } = useSavedArticles()

    return (
        <ScrollView style={{ flex: 1, backgroundColor: colors.cream }}>
            <View style={[s.header, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                {onBack && (
                    <Pressable
                        onPress={onBack}
                        hitSlop={10}
                        accessibilityLabel="Geri"
                        accessibilityRole="button"
                        style={s.backBtn}
                    >
                        <Ionicons name="arrow-back" size={20} color={colors.ink} />
                    </Pressable>
                )}
                <Text style={[s.screenTitle, { color: colors.ink }]}>Profil</Text>
            </View>

            <View style={{ padding: 20, gap: 20 }}>
                {/* App Info */}
                <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[s.appName, { color: colors.burgundy }]}>Scio</Text>
                    <Text style={[s.tagline, { color: colors.muted }]}>
                        Akademik okuma, ana dilinizde.
                    </Text>
                    <View style={[s.divider, { backgroundColor: colors.border }]} />
                    <Text style={[s.description, { color: colors.muted }]}>
                        İngilizce akademik makaleleri arXiv, Semantic Scholar ve OpenAlex
                        kaynaklarından arayıp Türkçeye çeviren bir okuma uygulaması.
                    </Text>
                </View>

                {/* Stats */}
                <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[s.sectionTitle, { color: colors.burgundy }]}>İstatistikler</Text>
                    <View style={s.statsRow}>
                        <View style={s.statItem}>
                            <Text style={[s.statNumber, { color: colors.ink }]}>{savedArticles.length}</Text>
                            <Text style={[s.statLabel, { color: colors.muted }]}>Kayıtlı Makale</Text>
                        </View>
                        <View style={[s.statDivider, { backgroundColor: colors.border }]} />
                        <View style={s.statItem}>
                            <Text style={[s.statNumber, { color: colors.ink }]}>{sources.length}</Text>
                            <Text style={[s.statLabel, { color: colors.muted }]}>Aktif Kaynak</Text>
                        </View>
                    </View>
                </View>

                {/* Current Settings Summary */}
                <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[s.sectionTitle, { color: colors.burgundy }]}>Aktif Ayarlar</Text>
                    <View style={s.settingRow}>
                        <Text style={[s.settingLabel, { color: colors.muted }]}>Çeviri Motoru</Text>
                        <Text style={[s.settingValue, { color: colors.ink }]}>
                            {ENGINE_LABELS[engine] ?? engine}
                        </Text>
                    </View>
                    <View style={s.settingRow}>
                        <Text style={[s.settingLabel, { color: colors.muted }]}>Çeviri Stili</Text>
                        <Text style={[s.settingValue, { color: colors.ink }]}>
                            {STYLE_LABELS[style] ?? style}
                        </Text>
                    </View>
                </View>

                {/* Version */}
                <Text style={[s.version, { color: colors.mutedLight }]}>Scio v1.0.0</Text>
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    )
}

const s = StyleSheet.create({
    backBtn: {
        padding: 2,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 16,
    },
    screenTitle: {
        fontFamily: SERIF_BOLD,
        fontSize: 26,
        lineHeight: 32,
    },
    card: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 20,
    },
    appName: {
        fontFamily: SERIF_ITALIC,
        fontSize: 16,
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    tagline: {
        fontFamily: SANS,
        fontSize: 14,
        lineHeight: 20,
    },
    divider: {
        height: 1,
        marginVertical: 14,
    },
    description: {
        fontFamily: SANS,
        fontSize: 13,
        lineHeight: 20,
    },
    sectionTitle: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 11,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 14,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statNumber: {
        fontFamily: SERIF_BOLD,
        fontSize: 28,
        marginBottom: 4,
    },
    statLabel: {
        fontFamily: SANS,
        fontSize: 12,
    },
    statDivider: {
        width: 1,
        height: 40,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    settingLabel: {
        fontFamily: SANS,
        fontSize: 13,
    },
    settingValue: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 13,
    },
    version: {
        fontFamily: SANS,
        fontSize: 11,
        textAlign: 'center',
        marginTop: 10,
    },
})
