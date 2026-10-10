import { useState } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, SafeAreaView } from 'react-native'
import type { ColorScheme } from '../theme/colors'

const SERIF_BOLD = 'SourceSerif4_700Bold'
const SANS = 'Inter_400Regular'
const SANS_MEDIUM = 'Inter_500Medium'
const SANS_SEMIBOLD = 'Inter_600SemiBold'

// Konu listesi src/api/topics.ts'te tek kaynakta tutuluyor: her konunun
// kullanıcıya görünen etiketi (Türkçe) ve akademik arama terimi (İngilizce)
// aynı yerde. Keşfet ekranı da bu listeyi kullandığı için ikisi ayrışamaz.
import { TOPICS as TOPIC_DEFS } from '../api/topics'

const TOPICS = TOPIC_DEFS.map((t) => t.label)

export default function OnboardingScreen({
    colors,
    onComplete,
}: {
    colors: ColorScheme
    onComplete: (topics: string[]) => void
}) {
    const [selected, setSelected] = useState<string[]>([])

    const toggle = (t: string) => {
        setSelected((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
    }

    const handleContinue = () => {
        if (selected.length > 0) {
            onComplete(selected)
        }
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
            <View style={s.container}>
                <View style={s.header}>
                    <Text style={[s.title, { color: colors.ink }]}>Neler okumak istersin?</Text>
                    <Text style={[s.subtitle, { color: colors.muted }]}>
                        Sana özel makale akışını oluşturmak için ilgilendiğin konuları seç.
                    </Text>
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={s.chipContainer}>
                    {TOPICS.map((topic) => {
                        const isSelected = selected.includes(topic)
                        return (
                            <Pressable
                                key={topic}
                                onPress={() => toggle(topic)}
                                accessibilityLabel={topic}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: isSelected }}
                                style={[
                                    s.chip,
                                    {
                                        backgroundColor: isSelected ? colors.burgundy : colors.card,
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
                                    {topic}
                                </Text>
                            </Pressable>
                        )
                    })}
                </ScrollView>

                <View style={s.footer}>
                    <Pressable
                        onPress={handleContinue}
                        disabled={selected.length === 0}
                        accessibilityLabel={
                            selected.length > 0
                                ? `${selected.length} konu seçildi, devam et`
                                : 'En az bir konu seçin'
                        }
                        accessibilityRole="button"
                        accessibilityState={{ disabled: selected.length === 0 }}
                        style={[
                            s.btn,
                            {
                                backgroundColor: selected.length > 0 ? colors.burgundy : colors.inputBorder,
                            },
                        ]}
                    >
                        <Text style={[s.btnText, { color: selected.length > 0 ? '#FAF7F2' : colors.muted }]}>
                            {selected.length > 0 ? 'Devam Et' : 'En az 1 konu seçin'}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    )
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
    },
    header: {
        marginTop: 40,
        marginBottom: 32,
    },
    title: {
        fontFamily: SERIF_BOLD,
        fontSize: 32,
        lineHeight: 40,
        marginBottom: 12,
    },
    subtitle: {
        fontFamily: SANS,
        fontSize: 16,
        lineHeight: 24,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    chip: {
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    chipText: {
        fontFamily: SANS_MEDIUM,
        fontSize: 15,
    },
    footer: {
        marginTop: 20,
        paddingBottom: 20,
    },
    btn: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    btnText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 16,
    },
})
