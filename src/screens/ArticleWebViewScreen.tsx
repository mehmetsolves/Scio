import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { WebView } from 'react-native-webview'
import type { ColorScheme } from '../theme/colors'

const SANS_SEMIBOLD = 'Inter_600SemiBold'
const SANS = 'Inter_400Regular'

function processUrl(url: string, translated: boolean): string {
    // 1. HTTP'yi HTTPS yap (Android WebView bazen HTTP'yi engeller)
    let safeUrl = url.replace(/^http:\/\//i, 'https://')

    // 2. arXiv PDF linklerini Abstract (HTML) sayfasına çevir
    // Örn: https://arxiv.org/pdf/1706.03762 -> https://arxiv.org/abs/1706.03762
    if (safeUrl.includes('arxiv.org/pdf/')) {
        safeUrl = safeUrl.replace('/pdf/', '/abs/').replace(/\.pdf$/i, '')
    }

    // 3. Türkçe çeviri istenmişse
    if (translated) {
        return `https://translate.google.com/translate?sl=auto&tl=tr&u=${encodeURIComponent(safeUrl)}`
    }

    // 4. Diğer rastgele PDF dosyalarıysa Google Docs Viewer üzerinden aç
    // (Çünkü Android WebView direkt .pdf uzantılarını gösteremez, indirir)
    if (safeUrl.toLowerCase().endsWith('.pdf')) {
        return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(safeUrl)}`
    }

    return safeUrl
}

export default function ArticleWebViewScreen({
    url,
    title,
    onBack,
    colors,
}: {
    url: string
    title: string
    onBack: () => void
    colors: ColorScheme
}) {
    const [loading, setLoading] = useState(true)
    const [translated, setTranslated] = useState(false)

    let domain = ''
    try { domain = new URL(url).hostname.replace(/^www\./, '') } catch {}

    const currentUrl = processUrl(url, translated)

    return (
        <View style={{ flex: 1, backgroundColor: colors.cream }}>
            {/* Nav */}
            <View style={[s.navBar, { borderBottomColor: colors.border, backgroundColor: colors.cream }]}>
                <View style={s.navRow}>
                    <Pressable onPress={onBack} hitSlop={8} style={{ padding: 6 }}>
                        <Text style={[s.backArrow, { color: colors.burgundy }]}>←</Text>
                    </Pressable>
                    <Text style={[s.navTitle, { color: colors.ink }]} numberOfLines={1}>
                        {title}
                    </Text>
                </View>
                <Text style={[s.domainLabel, { color: colors.mutedLight }]}>{domain}</Text>
            </View>

            {/* Loading indicator */}
            {loading && (
                <View style={s.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.burgundy} />
                </View>
            )}

            {/* WebView */}
            <WebView
                key={currentUrl}
                source={{ uri: currentUrl }}
                style={{ flex: 1 }}
                onLoadEnd={() => setLoading(false)}
                onLoadStart={() => setLoading(true)}
                startInLoadingState={false}
                javaScriptEnabled
                domStorageEnabled
            />

            {/* Language Toggle FAB */}
            <Pressable
                onPress={() => {
                    setTranslated((v) => !v)
                    setLoading(true)
                }}
                style={s.langToggle}
            >
                <Text style={{ fontSize: 14 }}>{translated ? '🇬🇧' : '🇹🇷'}</Text>
                <Text style={s.langToggleText}>{translated ? 'Orijinal' : 'Türkçe'}</Text>
            </Pressable>
        </View>
    )
}

const s = StyleSheet.create({
    navBar: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        gap: 2,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    backArrow: { fontSize: 18 },
    navTitle: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 13,
        flex: 1,
    },
    domainLabel: {
        fontFamily: SANS,
        fontSize: 11,
        marginLeft: 30,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        zIndex: 10,
        alignItems: 'center',
        paddingTop: 40,
    },
    langToggle: {
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
    langToggleText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 12,
        color: '#FAF7F2',
        letterSpacing: 0.4,
    },
})
