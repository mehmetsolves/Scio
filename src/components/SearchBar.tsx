import { memo, useState } from 'react'
import { View, TextInput, Pressable, ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { ColorScheme } from '../theme/colors'

const SANS = 'Inter_400Regular'

// Tüm sekmelerde (Makaleler, Bilim, Teknoloji, Gündem, Kaynaklarım) aynı
// görünen arama kutusu. Kontrollü bileşen: değeri ekran tutar, debounce
// `useDebouncedValue` ile ekranda yapılır — böylece kutu her tuşta anında
// tepki verir, ağır süzme/istek ise kullanıcı durunca çalışır.
function SearchBarImpl({
    value,
    onChangeText,
    placeholder = 'Ara...',
    accent,
    colors,
    onSubmit,
    busy = false,
    style,
    autoFocus,
}: {
    value: string
    onChangeText: (text: string) => void
    placeholder?: string
    // Sekmenin marka rengi (odakta kenarlık + ikon)
    accent: string
    colors: ColorScheme
    onSubmit?: (text: string) => void
    // Uzak arama sürüyorsa sağda küçük gösterge
    busy?: boolean
    style?: StyleProp<ViewStyle>
    autoFocus?: boolean
}) {
    const [focused, setFocused] = useState(false)
    const tint = focused ? accent : colors.mutedLight

    return (
        <View
            style={[
                s.box,
                { borderColor: focused ? accent : colors.inputBorder, backgroundColor: colors.card },
                style,
            ]}
        >
            <Ionicons name="search-outline" size={17} color={tint} style={{ marginRight: 8 }} />
            <TextInput
                value={value}
                onChangeText={onChangeText}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onSubmitEditing={() => onSubmit?.(value.trim())}
                returnKeyType="search"
                placeholder={placeholder}
                placeholderTextColor={colors.mutedLight}
                autoCorrect={false}
                autoFocus={autoFocus}
                selectionColor={accent}
                accessibilityLabel={placeholder}
                style={[s.input, { color: colors.ink }]}
            />
            {busy && <ActivityIndicator size="small" color={accent} style={{ marginRight: 6 }} />}
            {value.length > 0 && (
                <Pressable
                    onPress={() => onChangeText('')}
                    hitSlop={8}
                    accessibilityLabel="Aramayı temizle"
                    accessibilityRole="button"
                >
                    <Ionicons name="close-circle" size={17} color={colors.mutedLight} />
                </Pressable>
            )}
        </View>
    )
}

const SearchBar = memo(SearchBarImpl)
export default SearchBar

const s = StyleSheet.create({
    box: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 10,
        paddingHorizontal: 12,
        marginTop: 14,
    },
    input: {
        flex: 1,
        paddingVertical: 10,
        fontFamily: SANS,
        fontSize: 14,
    },
})
