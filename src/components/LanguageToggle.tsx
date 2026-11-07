import { memo } from 'react'
import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { getLanguage } from '../api/languages'

// Okuma ekranlarının (makale detayı, WebView, HN okuyucu) sağ alttaki ortak
// dil butonu. Etiket ve bayrak her zaman global `targetLanguage`'dan gelir.
function LanguageToggleImpl({
    showingTranslation,
    targetLanguage,
    busy = false,
    onPress,
}: {
    showingTranslation: boolean
    targetLanguage: string
    busy?: boolean
    onPress: () => void
}) {
    const target = getLanguage(targetLanguage)
    const label = busy ? 'Çevriliyor' : showingTranslation ? 'Orijinal' : target.label
    return (
        <Pressable
            onPress={onPress}
            accessibilityLabel={showingTranslation ? 'Orijinal metni göster' : `${target.label} diline çevir`}
            accessibilityRole="button"
            accessibilityState={{ busy }}
            style={[s.fab, { opacity: busy ? 0.8 : 1 }]}
        >
            {busy ? (
                <ActivityIndicator size="small" color="#FAF7F2" />
            ) : (
                <Text style={{ fontSize: 14 }}>{showingTranslation ? '📄' : target.flag}</Text>
            )}
            <Text style={s.text}>{label}</Text>
        </Pressable>
    )
}

const LanguageToggle = memo(LanguageToggleImpl)
export default LanguageToggle

const s = StyleSheet.create({
    fab: {
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
    text: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 12,
        color: '#FAF7F2',
        letterSpacing: 0.4,
    },
})
