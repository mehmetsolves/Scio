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
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useSettings, type SourceName, type Engine, type TranslationStyle } from '../store/SettingsContext'
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

// ─── Component ───────────────────────────────────────────────────────────────

export default function SettingsScreen({ colors, onBack }: { colors: ColorScheme; onBack?: () => void }) {
    const {
        sources,
        darkMode,
        engine,
        style,
        apiKey,
        toggleSource,
        setDarkMode,
        setEngine,
        setStyle,
        setApiKey,
    } = useSettings()

    const needsApiKey = engine !== 'mymemory'

    return (
        <ScrollView style={{ flex: 1, backgroundColor: colors.cream }}>
            <View style={[s.header, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                {onBack && (
                    <Pressable onPress={onBack} hitSlop={10} style={s.backBtn}>
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
                                trackColor={{ false: colors.inputBorder, true: colors.burgundy }}
                                thumbColor={colors.card}
                            />
                        </View>
                    ))}
                </View>

                {/* ── Appearance ── */}
                <View style={[s.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[s.sectionTitle, { color: colors.burgundy }]}>Görünüm</Text>
                    <View style={s.switchRow}>
                        <Text style={[s.switchLabel, { color: colors.ink }]}>Koyu Tema</Text>
                        <Switch
                            value={darkMode}
                            onValueChange={setDarkMode}
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
