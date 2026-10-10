import { useState } from 'react'
import {
    View,
    Text,
    Switch,
    TextInput,
    Pressable,
    ScrollView,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import {
    useSettings,
    type SourceName,
    type Engine,
    type TranslationStyle,
    type CategoryId,
} from '../store/SettingsContext'
import { useCustomSources } from '../store/CustomSourcesContext'
import type { ColorScheme } from '../theme/colors'

// ─── Font constants (same as App.tsx) ────────────────────────────────────────

const SERIF_BOLD = 'SourceSerif4_700Bold'
const SANS = 'Inter_400Regular'
const SANS_MEDIUM = 'Inter_500Medium'
const SANS_SEMIBOLD = 'Inter_600SemiBold'

// ─── Source display info ─────────────────────────────────────────────────────

const SOURCE_LABELS: Record<SourceName, string> = {
    arxiv: 'arXiv',
    semanticscholar: 'Semantic Scholar',
    openalex: 'OpenAlex',
}

const ENGINE_LABELS: { key: Engine; label: string; free?: boolean }[] = [
    { key: 'mymemory', label: 'MyMemory', free: true },
    { key: 'anthropic', label: 'Anthropic' },
    { key: 'openai', label: 'OpenAI' },
    { key: 'groq', label: 'Groq (Llama)' },
    { key: 'gemini', label: 'Google Gemini' },
]

const STYLE_LABELS: { key: TranslationStyle; label: string }[] = [
    { key: 'academic', label: 'Akademik' },
    { key: 'simple', label: 'Sade' },
]

const CATEGORY_LABELS: Record<CategoryId, string> = {
    discover: 'Keşfet (makaleler)',
    evrimagaci: 'Bilim (Evrim Ağacı)',
    hn: 'Teknoloji (Hacker News)',
    news: 'Gündem (Türk haberleri)',
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SettingsScreen({ colors, onBack }: { colors: ColorScheme; onBack?: () => void }) {
    const {
        sources,
        darkMode,
        engine,
        style,
        apiKey,
        hiddenTabs,
        toggleSource,
        setDarkMode,
        setEngine,
        setStyle,
        setApiKey,
        toggleTab,
    } = useSettings()
    const { customSources, addSource, removeSource } = useCustomSources()

    // Özel kaynak ekleme formunun yerel durumu
    const [siteLabel, setSiteLabel] = useState('')
    const [siteUrl, setSiteUrl] = useState('')
    const [saving, setSaving] = useState(false)

    const needsApiKey = engine !== 'mymemory'

    const handleAddSite = async () => {
        if (saving) return
        setSaving(true)
        try {
            const result = await addSource(siteLabel, siteUrl)
            if (result.ok) {
                setSiteLabel('')
                setSiteUrl('')
            } else {
                Alert.alert('Eklenemedi', result.error)
            }
        } finally {
            setSaving(false)
        }
    }

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
                <Text style={[s.screenTitle, { color: colors.ink }]}>Ayarlar</Text>
            </View>

            <View style={{ padding: 20, gap: 24 }}>
                {/* ── Sources ── */}
                <View style={[s.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[s.sectionTitle, { color: colors.burgundy }]}>Kaynaklar</Text>
                    {(['arxiv', 'semanticscholar', 'openalex'] as SourceName[]).map((src) => (
                        <View key={src} style={[s.switchRow, { borderBottomColor: colors.border }]}>
                            <Text style={[s.switchLabel, { color: colors.ink }]}>{SOURCE_LABELS[src]}</Text>
                            <Switch
                                value={sources.includes(src)}
                                onValueChange={() => toggleSource(src)}
                                accessibilityLabel={`${SOURCE_LABELS[src]} kaynağı`}
                                trackColor={{ false: colors.inputBorder, true: colors.burgundy }}
                                thumbColor={colors.card}
                            />
                        </View>
                    ))}
                </View>

                {/* ── Kategoriler ── */}
                <View style={[s.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[s.sectionTitle, { color: colors.burgundy }]}>Kategoriler</Text>
                    <Text style={[s.sectionHint, { color: colors.muted }]}>
                        Alt barda hangi sekmeler görünsün. Keşfet her zaman açık kalır.
                    </Text>
                    {(Object.keys(CATEGORY_LABELS) as CategoryId[]).map((cat) => {
                        const isFixed = cat === 'discover'
                        const visible = !hiddenTabs.includes(cat)
                        return (
                            <View key={cat} style={[s.switchRow, { borderBottomColor: colors.border }]}>
                                <Text style={[s.switchLabel, { color: isFixed ? colors.mutedLight : colors.ink }]}>
                                    {CATEGORY_LABELS[cat]}
                                    {isFixed ? ' (sabit)' : ''}
                                </Text>
                                <Switch
                                    value={visible}
                                    onValueChange={() => toggleTab(cat)}
                                    disabled={isFixed}
                                    accessibilityLabel={`${CATEGORY_LABELS[cat]} sekmesi`}
                                    trackColor={{ false: colors.inputBorder, true: colors.burgundy }}
                                    thumbColor={colors.card}
                                />
                            </View>
                        )
                    })}
                </View>

                {/* ── Özel Kaynaklar ── */}
                <View style={[s.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[s.sectionTitle, { color: colors.burgundy }]}>Kendi Siteni Ekle</Text>
                    <Text style={[s.sectionHint, { color: colors.muted }]}>
                        Bir RSS veya Atom adresi ekle; eklediğin sitenin haberleri Gündem akışına karışır.
                    </Text>

                    <TextInput
                        value={siteLabel}
                        onChangeText={setSiteLabel}
                        placeholder="Site adı (örn. Webtekno)"
                        placeholderTextColor={colors.mutedLight}
                        style={[s.apiKeyInput, { color: colors.ink, borderColor: colors.inputBorder, backgroundColor: colors.cream }]}
                    />
                    <TextInput
                        value={siteUrl}
                        onChangeText={setSiteUrl}
                        placeholder="https://site.com/rss"
                        placeholderTextColor={colors.mutedLight}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                        style={[s.apiKeyInput, { color: colors.ink, borderColor: colors.inputBorder, backgroundColor: colors.cream }]}
                    />

                    <Pressable
                        onPress={handleAddSite}
                        disabled={saving || !siteLabel.trim() || !siteUrl.trim()}
                        accessibilityLabel="Siteyi ekle"
                        accessibilityRole="button"
                        style={[
                            s.addBtn,
                            {
                                backgroundColor: colors.burgundy,
                                opacity: saving || !siteLabel.trim() || !siteUrl.trim() ? 0.5 : 1,
                            },
                        ]}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={s.addBtnText}>Siteyi Ekle</Text>
                        )}
                    </Pressable>

                    {customSources.length > 0 && (
                        <View style={{ marginTop: 14, gap: 8 }}>
                            {customSources.map((src) => (
                                <View key={src.id} style={[s.customRow, { borderColor: colors.border }]}>
                                    <Ionicons name="globe-outline" size={15} color={colors.muted} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.customLabel, { color: colors.ink }]}>{src.label}</Text>
                                        <Text style={[s.customUrl, { color: colors.mutedLight }]} numberOfLines={1}>
                                            {src.rssUrl}
                                        </Text>
                                    </View>
                                    <Pressable
                                        onPress={() => removeSource(src.id)}
                                        hitSlop={10}
                                        accessibilityLabel={`${src.label} kaynağını sil`}
                                        accessibilityRole="button"
                                        style={{ padding: 4 }}
                                    >
                                        <Ionicons name="close" size={16} color={colors.muted} />
                                    </Pressable>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* ── Appearance ── */}
                <View style={[s.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[s.sectionTitle, { color: colors.burgundy }]}>Görünüm</Text>
                    <View style={s.switchRow}>
                        <Text style={[s.switchLabel, { color: colors.ink }]}>Koyu Tema</Text>
                        <Switch
                            value={darkMode}
                            onValueChange={setDarkMode}
                            accessibilityLabel="Koyu tema"
                            trackColor={{ false: colors.inputBorder, true: colors.burgundy }}
                            thumbColor={colors.card}
                        />
                    </View>
                </View>

                {/* ── Engine ── */}
                <View style={[s.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[s.sectionTitle, { color: colors.burgundy }]}>Çeviri Motoru</Text>
                    <View style={s.segmentCol}>
                        {ENGINE_LABELS.map((item) => {
                            const active = engine === item.key
                            return (
                                <Pressable
                                    key={item.key}
                                    onPress={() => setEngine(item.key)}
                                    style={[
                                        s.segmentBtn,
                                        {
                                            flex: 1,
                                            flexDirection: 'row',
                                            justifyContent: 'center',
                                            gap: 6,
                                            backgroundColor: active ? colors.burgundy : colors.cream,
                                            borderColor: active ? colors.burgundy : colors.inputBorder,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            s.segmentText,
                                            { color: active ? '#FFFFFF' : colors.muted },
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                    {item.free && (
                                        <View style={[s.freeBadge, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#E8F5E9' }]}>
                                            <Text style={[s.freeText, { color: active ? '#FFFFFF' : '#2E7D32' }]}>
                                                Ücretsiz
                                            </Text>
                                        </View>
                                    )}
                                </Pressable>

                            )
                        })}
                    </View>
                </View>

                {/* ── Style ── */}
                <View style={[s.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[s.sectionTitle, { color: colors.burgundy }]}>Çeviri Stili</Text>
                    <View style={s.segmentRow}>
                        {STYLE_LABELS.map((item) => {
                            const active = style === item.key
                            return (
                                <Pressable
                                    key={item.key}
                                    onPress={() => setStyle(item.key)}
                                    style={[
                                        s.segmentBtn,
                                        {
                                            flex: 1,
                                            backgroundColor: active ? colors.burgundy : colors.cream,
                                            borderColor: active ? colors.burgundy : colors.inputBorder,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            s.segmentText,
                                            { color: active ? '#FFFFFF' : colors.muted },
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                </Pressable>
                            )
                        })}
                    </View>
                </View>

                {/* ── API Key ── */}
                {needsApiKey && (
                    <View style={[s.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[s.sectionTitle, { color: colors.burgundy }]}>API Key</Text>
                        <TextInput
                            value={apiKey}
                            onChangeText={setApiKey}
                            secureTextEntry
                            placeholder={
                                engine === 'anthropic' ? 'sk-ant-...' :
                                engine === 'openai' ? 'sk-...' :
                                engine === 'groq' ? 'gsk_...' :
                                engine === 'gemini' ? 'AIza...' : 'API Key'
                            }
                            placeholderTextColor={colors.mutedLight}
                            autoCapitalize="none"
                            autoCorrect={false}
                            style={[
                                s.apiKeyInput,
                                {
                                    color: colors.ink,
                                    borderColor: colors.inputBorder,
                                    backgroundColor: colors.cream,
                                },
                            ]}
                        />
                        <Text style={[s.apiKeyHint, { color: colors.muted }]}>
                            Bu key sadece cihazında şifreli olarak saklanır, her çeviri isteğinde
                            backend'e iletilir, hiçbir yerde tutulmaz.
                        </Text>
                    </View>
                )}
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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
    sectionCard: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
    },
    sectionTitle: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 11,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 14,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    switchLabel: {
        fontFamily: SANS_MEDIUM,
        fontSize: 14,
    },
    segmentRow: {
        flexDirection: 'row',
        gap: 8,
    },
    segmentBtn: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
    },
    segmentText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 12,
        letterSpacing: 0.3,
    },
    apiKeyInput: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 11,
        fontFamily: SANS,
        fontSize: 14,
        marginBottom: 8,
    },
    apiKeyHint: {
        fontFamily: SANS,
        fontSize: 11,
        lineHeight: 16,
    },
    sectionHint: {
        fontFamily: SANS,
        fontSize: 12,
        lineHeight: 18,
        marginTop: -8,
        marginBottom: 12,
    },
    addBtn: {
        marginTop: 10,
        paddingVertical: 11,
        borderRadius: 8,
        alignItems: 'center',
    },
    addBtnText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 13,
        color: '#FFFFFF',
    },
    customRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 9,
    },
    customLabel: {
        fontFamily: SANS_MEDIUM,
        fontSize: 13,
    },
    customUrl: {
        fontFamily: SANS,
        fontSize: 11,
        marginTop: 1,
    },
    segmentCol: {
        gap: 8,
    },
    freeBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
    },
    freeText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 9,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
})
