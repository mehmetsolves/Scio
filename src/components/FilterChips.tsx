import { memo } from 'react'
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native'
import type { ColorScheme } from '../theme/colors'

const SANS_SEMIBOLD = 'Inter_600SemiBold'

export interface FilterOption {
    id: string
    label: string
    // Seçiliyken kullanılacak renk; verilmezse sekmenin accent'i
    color?: string
}

// Arama kutusunun altındaki yatay filtre şeridi (kaynak / kapsam seçimi).
// Tüm sekmelerde aynı görünüm.
function FilterChipsImpl({
    options,
    value,
    onChange,
    accent,
    colors,
}: {
    options: FilterOption[]
    value: string
    onChange: (id: string) => void
    accent: string
    colors: ColorScheme
}) {
    if (options.length <= 1) return null
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={{ marginTop: 12 }}
            contentContainerStyle={{ paddingRight: 8 }}
        >
            {options.map((opt) => {
                const active = opt.id === value
                const color = opt.color ?? accent
                return (
                    <Pressable
                        key={opt.id}
                        onPress={() => onChange(opt.id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`Filtre: ${opt.label}`}
                        style={[
                            s.chip,
                            active
                                ? { backgroundColor: color, borderColor: color }
                                : { backgroundColor: 'transparent', borderColor: colors.inputBorder },
                        ]}
                    >
                        <Text style={[s.text, { color: active ? '#FFFFFF' : colors.muted }]} numberOfLines={1}>
                            {opt.label}
                        </Text>
                    </Pressable>
                )
            })}
        </ScrollView>
    )
}

const FilterChips = memo(FilterChipsImpl)
export default FilterChips

const s = StyleSheet.create({
    chip: {
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 13,
        paddingVertical: 6,
        marginRight: 8,
        maxWidth: 180,
    },
    text: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 12,
    },
})
