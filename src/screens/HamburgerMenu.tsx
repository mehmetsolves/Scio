import { View, Text, Pressable, StyleSheet } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { ColorScheme } from '../theme/colors'

const SERIF_BOLD = 'SourceSerif4_700Bold'
const SANS = 'Inter_400Regular'
const SANS_SEMIBOLD = 'Inter_600SemiBold'

type MenuTarget = 'saved' | 'settings' | 'profile'

// Sekme olmayan ekranlar buradan açılır: Kayıtlılar, Ayarlar, Profil.
// HNScreen'deki `datePicker` dropdown'ı pop-up deseniyle aynı (konumlandırma
// mutlak pozisyon + elevation/shadow) ama dışarı tıklayınca kapanması için
// bir Pressable overlay içeriyor.
export default function HamburgerMenu({
    colors,
    open,
    onClose,
    onSelect,
}: {
    colors: ColorScheme
    open: boolean
    onClose: () => void
    onSelect: (target: MenuTarget) => void
}) {
    if (!open) return null

    const items: { id: MenuTarget; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap }[] = [
        { id: 'saved', label: 'Kayıtlılar', sub: 'Kaydedilenler ve indirilenler', icon: 'bookmark-outline' },
        { id: 'settings', label: 'Ayarlar', sub: 'Kaynaklar, tema, çeviri motoru', icon: 'settings-outline' },
        { id: 'profile', label: 'Profil', sub: 'Hakkında ve istatistikler', icon: 'person-outline' },
    ]

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Dışarı tıklanınca menüyü kapat. Tıklama olayının kartın
                altındaki ekrana geçmesini engellemek için full overlay. */}
            <Pressable
                style={StyleSheet.absoluteFill}
                onPress={onClose}
                accessibilityLabel="Menüyü kapat"
                accessibilityRole="button"
            />

            {/* Sağ üstten açılan kart. 4 sekme ekranının hepsinde aynı yerde
                durması için parent'ında (SafeArea) üst sağ hizalı. */}
            <View style={[s.menu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[s.menuTitle, { color: colors.ink }]}>Scio</Text>

                {items.map((item) => (
                    <Pressable
                        key={item.id}
                        onPress={() => onSelect(item.id)}
                        accessibilityLabel={item.label}
                        accessibilityRole="button"
                        style={({ pressed }) => [
                            s.item,
                            {
                                backgroundColor: pressed ? colors.pressedCard : 'transparent',
                            },
                        ]}
                    >
                        <Ionicons name={item.icon} size={18} color={colors.burgundy} />
                        <View style={s.itemText}>
                            <Text style={[s.itemLabel, { color: colors.ink }]}>{item.label}</Text>
                            <Text style={[s.itemSub, { color: colors.mutedLight }]}>{item.sub}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color={colors.mutedLight} />
                    </Pressable>
                ))}
            </View>
        </View>
    )
}

// Hamburger düğmesi — dört sekme ekranının başlığında ortak görünüm.
export function MenuButton({
    onPress,
    colors,
}: {
    onPress: () => void
    colors: ColorScheme
}) {
    return (
        <Pressable
            onPress={onPress}
            hitSlop={8}
            accessibilityLabel="Menü"
            accessibilityRole="button"
            style={[s.iconBtn, { borderColor: colors.border }]}
        >
            <Ionicons name="menu-outline" size={18} color={colors.muted} />
        </Pressable>
    )
}

const s = StyleSheet.create({
    menu: {
        position: 'absolute',
        top: 56,
        right: 16,
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        minWidth: 220,
        gap: 4,
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
    },
    menuTitle: {
        fontFamily: SERIF_BOLD,
        fontSize: 16,
        paddingHorizontal: 10,
        paddingBottom: 8,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 10,
        paddingVertical: 9,
        borderRadius: 8,
    },
    itemText: {
        flex: 1,
        gap: 1,
    },
    itemLabel: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 14,
    },
    itemSub: {
        fontFamily: SANS,
        fontSize: 11,
    },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
})
