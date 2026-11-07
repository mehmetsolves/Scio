import { useState } from 'react'
import {
    View,
    Text,
    Switch,
    TextInput,
    Pressable,
    ScrollView,
    StyleSheet,
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
import { LANGUAGES, getLanguage } from '../api/languages'
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

// ─── Çeviri dilleri ──────────────────────────────────────────────────────────
// Kullanıcı birden fazla dil ekleyebilir. İlk dil varsayılandır: makale
// açılınca otomatik o dile çevrilir; diğerleri makale ekranındaki dil
// seçicisinde görünür.

function TranslationLanguagesSection({ colors }: { colors: ColorScheme }) {
    const { translationLangs, addTranslationLang, removeTranslationLang, setDefaultTranslationLang } = useSettings()
    const available = LANGUAGES.filter((l) => !translationLangs.includes(l.code))

    return (
        <View style={[s.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.sectionTitle, { color: colors.burgundy }]}>Çeviri Dilleri</Text>
            <Text style={[s.sectionHint, { color: colors.muted }]}>
                Makaleleri okumak istediğin dilleri ekle. Varsayılan dil, makale açılınca otomatik çeviri dilidir.
            </Text>

            {translationLangs.map((code, i) => {
                const lang = getLanguage(code)
                const isDefault = i === 0
                return (
                    <View key={code} style={[ls.row, { borderBottomColor: colors.border }]}>
                        <Text style={ls.flag}>{lang.flag}</Text>
                        <Text style={[ls.label, { color: colors.ink }]}>{lang.label}</Text>
                        {isDefault ? (
                            <View style={[ls.defaultBadge, { backgroundColor: colors.burgundyTint }]}>
                                <Text style={[ls.defaultText, { color: colors.burgundy }]}>Varsayılan</Text>
                            </View>
                        ) : (
                            <Pressable
                                onPress={() => setDefaultTranslationLang(code)}
                                hitSlop={6}
                                accessibilityLabel={`${lang.label} dilini varsayılan yap`}
                                accessibilityRole="button"
                            >
                                <Text style={[ls.makeDefault, { color: colors.muted }]}>Varsayılan yap</Text>
                            </Pressable>
                        )}
                        {translationLangs.length > 1 && (
                            <Pressable
                                onPress={() => removeTranslationLang(code)}
                                hitSlop={8}
                                accessibilityLabel={`${lang.label} dilini kaldır`}
                                accessibilityRole="button"
                                style={{ padding: 4 }}
                            >
                                <Ionicons name="close" size={16} color={colors.muted} />
                            </Pressable>
                        )}
                    </View>
                )
            })}

            {available.length > 0 && (
                <>
                    <Text style={[ls.addTitle, { color: colors.muted }]}>Dil ekle</Text>
                    <View style={ls.chipWrap}>
                        {available.map((lang) => (
                            <Pressable
                                key={lang.code}
                                onPress={() => addTranslationLang(lang.code)}
                                accessibilityLabel={`${lang.label} ekle`}
                                accessibilityRole="button"
                                style={({ pressed }) => [
                                    ls.chip,
                                    { borderColor: colors.inputBorder, backgroundColor: pressed ? colors.pressedCard : 'transparent' },
                                ]}
                            >
                                <Text style={ls.chipFlag}>{lang.flag}</Text>
                                <Text style={[ls.chipText, { color: colors.muted }]}>{lang.label}</Text>
                                <Ionicons name="add" size={13} color={colors.mutedLight} />
                            </Pressable>
                        ))}
                    </View>
                </>
            )}
        </View>
    )
}

const ls = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    flag: { fontSize: 18 },
    label: {
        flex: 1,
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
    },
    defaultBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    defaultText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 11,
    },
    makeDefault: {
        fontFamily: 'Inter_500Medium',
        fontSize: 12,
    },
    addTitle: {
        fontFamily: 'Inter_500Medium',
        fontSize: 12,
        marginTop: 14,
        marginBottom: 8,
    },
    chipWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    chipFlag: { fontSize: 13 },
    chipText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 12,
    },
})

// ─── Component ───────────────────────────────────────────────────────────────

export default function SettingsScreen({
    colors,
    onBack,
    onOpenTopics,
    onOpenSources,
}: {
    colors: ColorScheme
    onBack?: () => void
    onOpenTopics?: () => void
    onOpenSources?: () => void
}) {
    const {
        sources,
        darkMode,
        engine,
        style,
        apiKey,
        hiddenTabs,
        selectedTopics,
        toggleSource,
        setDarkMode,
        setEngine,
        setStyle,
        setApiKey,
        toggleTab,
    } = useSettings()
    const { customSources } = useCustomSources()

    const needsApiKey = engine !== 'mymemory'

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

                {/* ── İlgi Alanları ── */}
                <View style={[s.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[s.sectionTitle, { color: colors.burgundy }]}>İlgi Alanları</Text>
                    <Text style={[s.sectionHint, { color: colors.muted }]}>
                        Keşfet ekranında hangi konulardan makale görmek istediğini seç.
                    </Text>
                    <View style={[s.switchRow, { borderBottomColor: colors.border }]}>
                        <Text style={[s.switchLabel, { color: colors.ink }]}>Seçili konular</Text>
                        <Text style={[s.switchValue, { color: colors.muted }]} numberOfLines={1}>
                            {selectedTopics.length > 0
                                ? selectedTopics.length === 1
                                    ? selectedTopics[0]
                                    : `${selectedTopics[0]} +${selectedTopics.length - 1}`
                                : 'Seçilmedi'}
                        </Text>
                    </View>
                    <Pressable
                        onPress={onOpenTopics}
                        disabled={!onOpenTopics}
                        accessibilityLabel="İlgi alanlarını düzenle"
                        accessibilityRole="button"
                        style={[s.addBtn, { backgroundColor: colors.burgundy }]}
                    >
                        <Text style={s.addBtnText}>Düzenle</Text>
                    </Pressable>
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
                    <Text style={[s.sectionTitle, { color: colors.burgundy }]}>Kaynaklarım</Text>
                    <Text style={[s.sectionHint, { color: colors.muted }]}>
                        Kendi haber, bilim, teknoloji veya blog sitelerini ekle; içerikleri ilgili sekmede ve aramalarda görünür.
                    </Text>
                    <View style={[s.switchRow, { borderBottomColor: colors.border }]}>
                        <Text style={[s.switchLabel, { color: colors.ink }]}>Eklenen kaynak</Text>
                        <Text style={[s.switchValue, { color: colors.muted }]}>{customSources.length}</Text>
                    </View>
                    <Pressable
                        onPress={onOpenSources}
                        disabled={!onOpenSources}
                        accessibilityLabel="Kaynaklarımı yönet"
                        accessibilityRole="button"
                        style={[s.addBtn, { backgroundColor: colors.burgundy }]}
                    >
                        <Text style={s.addBtnText}>Kaynakları yönet</Text>
                    </Pressable>
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

                {/* ── Çeviri Dilleri ── */}
                <TranslationLanguagesSection colors={colors} />

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
    switchValue: {
        fontFamily: SANS_MEDIUM,
        fontSize: 13,
        maxWidth: 160,
        textAlign: 'right',
        flexShrink: 1,
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
