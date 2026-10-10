import { useState } from 'react'
import { View, Text, Pressable, ScrollView, SafeAreaView, StyleSheet } from 'react-native'
import type { ColorScheme } from '../theme/colors'
import { useSettings } from '../store/SettingsContext'
import { TOPICS } from '../api/topics'

const SERIF_ITALIC = 'SourceSerif4_400Regular_Italic'
const SERIF_BOLD = 'SourceSerif4_700Bold'
const SANS = 'Inter_400Regular'
const SANS_MEDIUM = 'Inter_500Medium'
const SANS_SEMIBOLD = 'Inter_600SemiBold'

// İlgi alanı seçimi. Onboarding'deki konu listesiyle AYNI kaynağı kullanır
// (src/api/topics.ts) — böylece buradan eklenen bir konu, Keşfet ekranında da
// akademik olarak aranabilir. Onboarding sadece ilk açılışta çalıştığı için
// kullanıcı sonradan seçimini değiştiremiyordu; bu ekran onun yerine geçer.
export default function TopicsScreen({
    colors,
    onBack,
}: {
    colors: ColorScheme
    onBack: () => void
}) {
    const { selectedTopics, setSelectedTopics } = useSettings()
    // Yerel kopya üzerinde çalış; "Kaydet" ile kalıcı yaz. Vazgeç butonu
    // bu kopyayı atar (geri alma desteği olmayan yarım seçimler kalmasın).
    const [draft, setDraft] = useState<string[]>(selectedTopics)

    const toggle = (t: string) => {
        setDraft((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
    }

    const save = () => {
        // Boş kaydetmeye izin verilmiyor: Keşfet ekranı en az bir konu ister.
        if (draft.length === 0) return
        setSelectedTopics(draft)
        onBack()
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
            <View style={[s.header, { borderBottomColor: colors.border }]}>
                <Pressable
                    onPress={onBack}
                    hitSlop={8}
                    accessibilityLabel="Geri"
                    accessibilityRole="button"
                    style={{ padding: 6 }}
                >
                    <Text style={[s.backArrow, { color: colors.burgundy }]}>←</Text>
                </Pressable>
                <Text style={[s.title, { color: colors.ink }]}>İlgi Alanları</Text>
                <Text style={[s.subtitle, { color: colors.muted }]}>
                    Keşfet ekranı bu konulardan makale toplar. En az birini seç.
                </Text>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body}>
                {TOPICS.map((topic) => {
                    const isSelected = draft.includes(topic.label)
                    return (
                        <Pressable
                            key={topic.label}
                            onPress={() => toggle(topic.label)}
                            accessibilityLabel={topic.label}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: isSelected }}
                            style={({ pressed }) => [
                                s.chip,
                                {
                                    backgroundColor: pressed
                                        ? colors.pressedCard
                                        : isSelected
                                            ? colors.burgundy
                                            : colors.card,
                                    borderColor: isSelected ? colors.burgundy : colors.inputBorder,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    s.chipText,
                                    { color: isSelected ? '#FAF7F2' : colors.ink },
                                ]}
                            >
                                {topic.label}
                            </Text>
                        </Pressable>
                    )
                })}
            </ScrollView>

            <View style={[s.footer, { borderTopColor: colors.border }]}>
                <Pressable
                    onPress={save}
                    disabled={draft.length === 0}
                    accessibilityLabel={`${draft.length} konu seçili, kaydet`}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: draft.length === 0 }}
                    style={[
                        s.btn,
                        {
                            backgroundColor: draft.length > 0 ? colors.burgundy : colors.inputBorder,
                        },
                    ]}
                >
                    <Text
                        style={[
                            s.btnText,
                            { color: draft.length > 0 ? '#FAF7F2' : colors.muted },
                        ]}
                    >
                        {draft.length > 0 ? `Kaydet (${draft.length})` : 'En az 1 konu seç'}
                    </Text>
                </Pressable>
            </View>
        </SafeAreaView>
    )
}

const s = StyleSheet.create({
    header: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        gap: 6,
    },
    backArrow: { fontSize: 18 },
    title: {
        fontFamily: SERIF_BOLD,
        fontSize: 26,
        lineHeight: 32,
    },
    subtitle: {
        fontFamily: SANS,
        fontSize: 13,
        lineHeight: 20,
    },
    body: {
        padding: 20,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    chipText: {
        fontFamily: SANS_MEDIUM,
        fontSize: 14,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
    },
    btn: {
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    btnText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 15,
    },
})
