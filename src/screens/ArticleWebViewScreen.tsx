import { useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import type { ColorScheme } from '../theme/colors'
import { useSettings } from '../store/SettingsContext'
import { useDownloads } from '../store/DownloadsContext'
import { CAPTURE_DOM_SCRIPT } from '../api/pageSnapshot'
import { makeStableId } from '../api/rss'
import { googleTranslateUrl } from '../utils/translateUrl'
import LanguageToggle from '../components/LanguageToggle'

const SANS_SEMIBOLD = 'Inter_600SemiBold'
const SANS = 'Inter_400Regular'

// RN'in URL sınıfında `hostname` bazı sürümlerde "not implemented" hatası
// atıyor (alan adı bu yüzden hiç görünmüyordu) — elle çıkarılıyor.
function hostOf(url: string): string {
    const m = url.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#:]+)/i)
    return m ? m[1].replace(/^www\./, '') : ''
}

// Bağlantı yokken Android/iOS'un verdiği hata kodları
function isOfflineError(desc: string, code: number): boolean {
    return (
        /INTERNET_DISCONNECTED|NAME_NOT_RESOLVED|NETWORK_CHANGED|ADDRESS_UNREACHABLE|offline|not appear to be connected/i.test(desc) ||
        code === -1009 // iOS NSURLErrorNotConnectedToInternet
    )
}

function processUrl(url: string, translated: boolean, targetLang: string): string {
    // 1. HTTP'yi HTTPS yap (Android WebView bazen HTTP'yi engeller)
    let safeUrl = url.replace(/^http:\/\//i, 'https://') 

    // 2. arXiv PDF linklerini Abstract (HTML) sayfasına çevir
    // Örn: https://arxiv.org/pdf/1706.03762 -> https://arxiv.org/abs/1706.03762
    if (safeUrl.includes('arxiv.org/pdf/')) {
        safeUrl = safeUrl.replace('/pdf/', '/abs/').replace(/\.pdf$/i, '')
    }

    // 3. Çeviri istenmişse (ayarlardaki varsayılan dile)
    if (translated) {
        return googleTranslateUrl(safeUrl, targetLang)
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
    // 0..1 arası yükleme ilerlemesi. Eskiden ortada büyük bir spinner vardı
    // ve onLoadEnd'i bekliyordu: arXiv HTML gibi sayfalarda metin çoktan
    // görünürken MathJax/font/görseller bitene kadar ekranda kalıyordu; sayfa
    // içi gezinmelerde ise hiç kapanmayabiliyordu.
    const [progress, setProgress] = useState(0)
    const [translated, setTranslated] = useState(false)
    // "Tekrar dene": WebView'i sıfırdan kurmak için anahtar
    const [reloadKey, setReloadKey] = useState(0)

    // Hedef dil global state'ten; değişirse URL (ve WebView) kendiliğinden yenilenir
    const { targetLanguage: targetLang } = useSettings()

    const domain = hostOf(url)

    const currentUrl = processUrl(url, translated, targetLang)

    // ── "Sayfayı kaydet" (Ctrl+S) ──
    // O an ekranda görünen sayfanın DOM'u alınır (JS ile oluşan içerik, açılmış
    // lazy görseller ve çevrilmiş görünüm dahil), CSS/görseller gömülerek tek
    // HTML dosyası olarak kaydedilir.
    // Paketin ref tipi platforma göre farklı tanımlı; ihtiyacımız tek metot
    const webRef = useRef<any>(null) as { current: { injectJavaScript: (js: string) => void } | null }
    const { downloadArticle, isDownloaded } = useDownloads()
    const [saving, setSaving] = useState(false)
    const pageId = makeStableId('web', url)
    const alreadySaved = isDownloaded(pageId)

    const handleSave = () => {
        if (saving) return
        setSaving(true)
        webRef.current?.injectJavaScript(CAPTURE_DOM_SCRIPT)
    }

    const handleMessage = (e: WebViewMessageEvent) => {
        let msg: any
        try {
            msg = JSON.parse(e.nativeEvent.data)
        } catch {
            return
        }
        if (msg?.type === 'scio-snapshot-error') {
            setSaving(false)
            Alert.alert('Kaydedilemedi', msg.message || 'Sayfa okunamadı.')
            return
        }
        if (msg?.type !== 'scio-snapshot' || typeof msg.html !== 'string') return
        downloadArticle({
            id: pageId,
            source: domain || 'web',
            title: title || msg.title || domain,
            description: '',
            link: url,
            capturedHtml: msg.html,
            capturedUrl: msg.url,
        })
            .then(() =>
                Alert.alert(
                    'Sayfa kaydedildi',
                    'Görselleri ve düzeniyle birlikte kaydedildi. Kayıtlılar bölümünden internetsiz açabilirsin.',
                ),
            )
            .catch((err) => Alert.alert('Kaydedilemedi', err?.message || 'Bir hata oluştu.'))
            .finally(() => setSaving(false))
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.cream }}>
            {/* Nav */}
            <View style={[s.navBar, { borderBottomColor: colors.border, backgroundColor: colors.cream }]}>
                <View style={s.navRow}>
                    <Pressable
                        onPress={onBack}
                        hitSlop={8}
                        accessibilityLabel="Geri"
                        accessibilityRole="button"
                        style={{ padding: 6 }}
                    >
                        <Text style={[s.backArrow, { color: colors.burgundy }]}>←</Text>
                    </Pressable>
                    <Text style={[s.navTitle, { color: colors.ink }]} numberOfLines={1}>
                        {title}
                    </Text>
                    <Pressable
                        onPress={handleSave}
                        disabled={saving}
                        hitSlop={8}
                        accessibilityLabel={
                            saving ? 'Sayfa kaydediliyor' : alreadySaved ? 'Sayfayı yeniden kaydet' : 'Sayfayı çevrimdışı için kaydet'
                        }
                        accessibilityRole="button"
                        style={{ padding: 6 }}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color={colors.burgundy} />
                        ) : (
                            <Ionicons
                                name={alreadySaved ? 'checkmark-circle' : 'download-outline'}
                                size={20}
                                color={colors.burgundy}
                            />
                        )}
                    </Pressable>
                </View>
                <Text style={[s.domainLabel, { color: colors.mutedLight }]}>{domain}</Text>
            </View>

            {/* İnce ilerleme çubuğu — içeriği örtmez, gerçek ilerlemeyi gösterir */}
            <View style={s.progressTrack}>
                {progress > 0 && progress < 1 && (
                    <View
                        style={[
                            s.progressBar,
                            { width: `${Math.max(progress, 0.08) * 100}%`, backgroundColor: colors.burgundy },
                        ]}
                    />
                )}
            </View>

            {/* WebView */}
            <WebView
                ref={(r: any) => {
                    webRef.current = r
                }}
                key={`${currentUrl}#${reloadKey}`}
                source={{ uri: currentUrl }}
                onMessage={handleMessage}
                style={{ flex: 1, backgroundColor: colors.cream }}
                onLoadStart={() => setProgress(0.08)}
                onLoadProgress={(e) => setProgress(e.nativeEvent.progress)}
                onLoadEnd={() => setProgress(1)}
                // Bağlantı yokken sistemin İngilizce hata sayfası yerine kendi ekranımız
                renderError={(_domain, code, desc) => {
                    const offline = isOfflineError(desc ?? '', code)
                    return (
                        <View style={[s.errorBox, { backgroundColor: colors.cream }]}>
                            <Ionicons
                                name={offline ? 'cloud-offline-outline' : 'alert-circle-outline'}
                                size={40}
                                color={colors.mutedLight}
                            />
                            <Text style={[s.errorTitle, { color: colors.ink }]}>
                                {offline ? 'İnternet bağlantısı yok' : 'Sayfa açılamadı'}
                            </Text>
                            <Text style={[s.errorText, { color: colors.muted }]}>
                                {offline
                                    ? 'Bağlantın gelince tekrar dene. Makaleyi önceden indirdiysen Kayıtlılar bölümünden çevrimdışı okuyabilirsin.'
                                    : desc || 'Site yanıt vermedi.'}
                            </Text>
                            <Pressable
                                onPress={() => {
                                    setProgress(0)
                                    setReloadKey((k) => k + 1)
                                }}
                                accessibilityRole="button"
                                style={[s.retryBtn, { backgroundColor: colors.burgundy }]}
                            >
                                <Text style={s.retryText}>Tekrar dene</Text>
                            </Pressable>
                        </View>
                    )
                }}
                startInLoadingState={false}
                javaScriptEnabled
                domStorageEnabled
            />

            {/* Language Toggle FAB — ortak bileşen, etiket global targetLanguage */}
            <LanguageToggle
                showingTranslation={translated}
                targetLanguage={targetLang}
                onPress={() => {
                    setTranslated((v) => !v)
                    setProgress(0)
                }}
            />
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
    progressTrack: {
        height: 2,
    },
    progressBar: {
        height: 2,
    },
    errorBox: {
        // RN 0.88'de absoluteFillObject kaldırıldı
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 10,
    },
    errorTitle: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 16,
        textAlign: 'center',
    },
    errorText: {
        fontFamily: SANS,
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'center',
    },
    retryBtn: {
        marginTop: 8,
        paddingHorizontal: 22,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryText: {
        fontFamily: SANS_SEMIBOLD,
        fontSize: 13,
        color: '#FFFFFF',
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
