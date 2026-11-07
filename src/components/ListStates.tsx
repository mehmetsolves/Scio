import { memo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { ColorScheme } from '../theme/colors'

const SANS = 'Inter_400Regular'
const SANS_SEMIBOLD = 'Inter_600SemiBold'

// ─── Skeleton ────────────────────────────────────────────────────────────────
// Veri gelmeden önce sayfanın iskeletini hemen çizer; spinner yerine
// kullanılır ki ekran geçişi "donmuş" görünmesin.

function SkeletonCard({ colors }: { colors: ColorScheme }) {
    const bar = { backgroundColor: colors.inputBorder, opacity: 0.55 }
    return (
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[s.bar, bar, { width: '28%', height: 10 }]} />
            <View style={[s.bar, bar, { width: '92%', height: 15 }]} />
            <View style={[s.bar, bar, { width: '70%', height: 15 }]} />
            <View style={[s.bar, bar, { width: '45%', height: 11 }]} />
        </View>
    )
}

export const SkeletonList = memo(function SkeletonList({ colors, count = 5 }: { colors: ColorScheme; count?: number }) {
    return (
        <View style={{ padding: 16 }} accessibilityLabel="Yükleniyor" accessibilityRole="progressbar">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} colors={colors} />
            ))}
        </View>
    )
})

// ─── Empty / error state ─────────────────────────────────────────────────────

export const EmptyState = memo(function EmptyState({
    icon,
    title,
    subtitle,
    actionLabel,
    onAction,
    accent,
    colors,
}: {
    icon: keyof typeof Ionicons.glyphMap
    title: string
    subtitle?: string
    actionLabel?: string
    onAction?: () => void
    accent: string
    colors: ColorScheme
}) {
    return (
        <View style={s.empty}>
            <Ionicons name={icon} size={34} color={colors.mutedLight} />
            <Text style={[s.title, { color: colors.ink }]}>{title}</Text>
            {subtitle ? <Text style={[s.sub, { color: colors.muted }]}>{subtitle}</Text> : null}
            {actionLabel && onAction ? (
                <Pressable
                    onPress={onAction}
                    accessibilityRole="button"
                    style={[s.btn, { backgroundColor: accent }]}
                >
                    <Text style={s.btnText}>{actionLabel}</Text>
                </Pressable>
            ) : null}
        </View>
    )
})

const s = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        gap: 9,
    },
    bar: {
        borderRadius: 4,
    },
    empty: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingVertical: 48,
        gap: 8,
    },
    title: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 16,
        textAlign: 'center',
        marginTop: 4,
    },
    sub: {
        fontFamily: SANS,
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'center',
    },
    btn: {
        marginTop: 10,
        paddingHorizontal: 22,
        paddingVertical: 10,
        borderRadius: 8,
    },
    btnText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 13,
        color: '#FFFFFF',
    },
})
