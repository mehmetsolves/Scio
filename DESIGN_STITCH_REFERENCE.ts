// ─────────────────────────────────────────────────────────────────────────────
// Scio — Google Stitch Design Reference
// ─────────────────────────────────────────────────────────────────────────────
//
// Bu dosya Google Stitch'e verilmek üzere sıfırdan yazılmış bir tasarım
// referans dosyasıdır. Uygulamanın tüm ekranlarının layout yapısını,
// renk tokenlerini, tipografi hiyerarşisini ve bileşen anatomisini
// tanımlar. Stitch bu dosyayı okuyarak mobil tasarım üretebilir.
//
// Platform: React Native (Expo)
// Aspect Ratio: 9:16 (mobil portarit)
// Design Language: Editorial / Magazine-inspired
// ─────────────────────────────────────────────────────────────────────────────

import { StyleSheet, Dimensions } from 'react-native'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

// ═══════════════════════════════════════════════════════════════════════════════
// BÖLÜM 1: DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 1.1 Renk Sistemi ────────────────────────────────────────────────────────

export const COLORS = {
    // ── Birincil Marka Renkleri ──
    brand: {
        burgundy:     '#7C1D2E',    // Ana marka rengi — CTA, başlıklar, aktif tab
        burgundyLight:'#9B3A4B',    // Hover/pressed varyant
        burgundyTint: 'rgba(124,29,46,0.08)', // Arka plan vurgusu
        burgundyGlow: 'rgba(124,29,46,0.15)', // Focus ring shadow
    },

    // ── Yüzey Renkleri (Light Mode) ──
    surface: {
        cream:       '#FAF7F2',     // Sayfa arka planı
        white:       '#FFFFFF',     // Kart arka planı
        warm50:      '#F5F0EA',     // Pressed kart, abstract kutu
        warm100:     '#EDE7DF',     // Divider altı bölge
        warm200:     '#E4DED6',     // Border, ayırıcı
    },

    // ── Yüzey Renkleri (Dark Mode) ──
    surfaceDark: {
        bg:          '#121212',     // Sayfa arka planı
        card:        '#1E1C1A',     // Kart arka planı
        elevated:    '#262320',     // Pressed/hover kart
        border:      '#2A2725',     // Sınır çizgileri
        inputBorder: '#3A3632',     // Input çerçeve
    },

    // ── Metin Renkleri ──
    text: {
        primary:     '#1A1A1A',     // Başlıklar, ana metin
        secondary:   '#4A4540',     // Abstract, body
        muted:       '#6B6560',     // Metadata, yardımcı
        subtle:      '#A09890',     // Placeholder, ipucu
        inverse:     '#FAF7F2',     // Koyu arka plan üstünde
        // Dark mode
        primaryDark: '#E8E4DF',
        secondaryDark:'#B0AAA4',
        mutedDark:   '#9E9A95',
    },

    // ── Kaynak Renk Kodları ──
    sources: {
        arxiv:       { fg: '#7C1D2E', bg: '#F5E8EB', label: 'arXiv' },
        semantic:    { fg: '#1B2B4B', bg: '#E8EDF5', label: 'Semantic Scholar' },
        openalex:    { fg: '#2D5016', bg: '#EBF2E8', label: 'OpenAlex' },
        evrimagaci:  { fg: '#2D8C3E', bg: '#E8F5E9', label: 'Evrim Ağacı' },
        hn:          { fg: '#E65100', bg: '#FFF3E0', label: 'Hacker News' },
        bbc:         { fg: '#BB1919', bg: '#FDE8E8', label: 'BBC Türkçe' },
        ntv:         { fg: '#1A237E', bg: '#E8EAF6', label: 'NTV' },
        sozcu:       { fg: '#D84315', bg: '#FBE9E7', label: 'Sözcü' },
        hurriyet:    { fg: '#0D47A1', bg: '#E3F2FD', label: 'Hürriyet' },
    },

    // ── Sistem Renkleri ──
    system: {
        success:     '#2D8C3E',
        warning:     '#E65100',
        error:       '#C62828',
        info:        '#1565C0',
        live:        '#C62828',     // Canlı/son dakika göstergesi
    },

    // ── Gradient Tanımları ──
    gradients: {
        heroFade:    ['#FAF7F2', 'rgba(250,247,242,0)'],
        cardShine:   ['rgba(255,255,255,0)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0)'],
        brandGlow:   ['#7C1D2E', '#9B3A4B', '#C0526A'],
    },
}

// ─── 1.2 Tipografi Sistemi ───────────────────────────────────────────────────

export const TYPOGRAPHY = {
    // ── Font Aileleri ──
    families: {
        serif:          'SourceSerif4_400Regular',
        serifItalic:    'SourceSerif4_400Regular_Italic',
        serifSemiBold:  'SourceSerif4_600SemiBold',
        serifBold:      'SourceSerif4_700Bold',
        sans:           'Inter_400Regular',
        sansMedium:     'Inter_500Medium',
        sansSemiBold:   'Inter_600SemiBold',
    },

    // ── Metin Ölçek Sistemi ──
    scale: {
        // Başlıklar (Serif)
        hero:           { size: 28, lineHeight: 36, family: 'serifBold', letterSpacing: -0.5 },
        h1:             { size: 26, lineHeight: 32, family: 'serifBold', letterSpacing: -0.3 },
        h2:             { size: 22, lineHeight: 30, family: 'serifBold', letterSpacing: -0.2 },
        h3:             { size: 18, lineHeight: 26, family: 'serifSemiBold', letterSpacing: 0 },
        cardTitle:      { size: 16, lineHeight: 22, family: 'serifSemiBold', letterSpacing: 0 },
        cardTitleSm:    { size: 15, lineHeight: 20, family: 'serifSemiBold', letterSpacing: 0 },

        // Body (Serif italic — abstract)
        abstract:       { size: 14, lineHeight: 24, family: 'serifItalic', letterSpacing: 0.1 },
        quote:          { size: 15, lineHeight: 26, family: 'serifItalic', letterSpacing: 0.1 },

        // UI Text (Sans)
        body:           { size: 14, lineHeight: 22, family: 'sans', letterSpacing: 0 },
        bodyMedium:     { size: 14, lineHeight: 22, family: 'sansMedium', letterSpacing: 0 },
        caption:        { size: 13, lineHeight: 20, family: 'sans', letterSpacing: 0 },
        small:          { size: 12, lineHeight: 18, family: 'sans', letterSpacing: 0 },
        tiny:           { size: 11, lineHeight: 16, family: 'sans', letterSpacing: 0 },

        // Etiketler (Sans SemiBold, uppercase)
        label:          { size: 11, lineHeight: 14, family: 'sansSemiBold', letterSpacing: 1.0 },
        badge:          { size: 11, lineHeight: 14, family: 'sansSemiBold', letterSpacing: 0.6 },
        tabLabel:       { size: 10, lineHeight: 14, family: 'sans', letterSpacing: 0 },

        // Marka
        brand:          { size: 13, lineHeight: 16, family: 'serifItalic', letterSpacing: 2.0 },
        brandLarge:     { size: 18, lineHeight: 22, family: 'serifItalic', letterSpacing: 3.0 },
    },
}

// ─── 1.3 Spacing & Layout ────────────────────────────────────────────────────

export const SPACING = {
    // 4pt grid
    xs:   4,
    sm:   8,
    md:   12,
    lg:   16,
    xl:   20,
    xxl:  24,
    xxxl: 32,
    huge: 40,

    // Ekran kenar boşlukları
    screenPadding: 24,
    cardPadding: 18,
    cardPaddingCompact: 14,

    // Bileşen arası boşluklar
    sectionGap: 28,
    cardGap: 10,
    elementGap: 14,
}

export const RADIUS = {
    xs:   4,
    sm:   8,
    md:   10,
    lg:   12,
    xl:   16,
    pill:  20,
    round: 22,
    full:  9999,
}

export const ELEVATION = {
    none: {
        shadowColor: 'transparent',
        shadowOpacity: 0,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 0 },
        elevation: 0,
    },
    low: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
    },
    medium: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
    },
    high: {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
    fab: {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
    },
}

// ═══════════════════════════════════════════════════════════════════════════════
// BÖLÜM 2: BİLEŞEN STİLLERİ (Component Anatomy)
// ═══════════════════════════════════════════════════════════════════════════════

export const componentStyles = StyleSheet.create({

    // ─── 2.1 Source Badge ────────────────────────────────────────────────────
    // Kullanım: Her makalenin kaynağını gösteren küçük etiket
    // Boyut: ~60x20px, border-radius: 4, uppercase text
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: RADIUS.xs,
    },
    badgeText: {
        fontFamily: TYPOGRAPHY.families.sansSemiBold,
        fontSize: 11,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },

    // ─── 2.2 Article Card ────────────────────────────────────────────────────
    // Kullanım: Arama sonuçları ve öneriler listesinde
    // Anatomy: [Badge] → [Title] → [Authors · Year] → [Abstract 2-line]
    card: {
        borderWidth: 1,
        borderRadius: RADIUS.lg,
        padding: SPACING.cardPadding,
    },
    cardCompact: {
        padding: SPACING.cardPaddingCompact,
    },
    cardTitle: {
        fontFamily: TYPOGRAPHY.families.serifSemiBold,
        fontSize: 16,
        lineHeight: 22,
        marginBottom: 5,
    },
    cardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        marginBottom: SPACING.md,
    },
    cardMetaText: {
        fontFamily: TYPOGRAPHY.families.sans,
        fontSize: 12,
    },
    cardMetaDot: {
        fontSize: 12,
    },
    cardAbstract: {
        fontFamily: TYPOGRAPHY.families.sans,
        fontSize: 13,
        lineHeight: 20,
    },

    // ─── 2.3 News/HN Preview Card ───────────────────────────────────────────
    // Kullanım: HomeScreen'deki mini haber önizlemesi
    // Anatomy: [Icon/Badge] → [Title 2-line] → [Source · Time]
    previewCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    previewIcon: {
        fontSize: 12,
        marginRight: 6,
        marginTop: 3,
    },
    previewContent: {
        flex: 1,
    },
    previewTitle: {
        fontFamily: TYPOGRAPHY.families.serifSemiBold,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 3,
    },
    previewMeta: {
        fontFamily: TYPOGRAPHY.families.sans,
        fontSize: 11,
    },

    // ─── 2.4 Search Box ─────────────────────────────────────────────────────
    // Kullanım: HomeScreen başlık alanında
    // Anatomy: [🔍 Icon] + [TextInput placeholder]
    // States: default, focused (burgundy border + shadow)
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: RADIUS.md,
        paddingHorizontal: 14,
        height: 48,
    },
    searchIcon: {
        fontSize: 15,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 13,
        fontFamily: TYPOGRAPHY.families.sans,
        fontSize: 14,
    },

    // ─── 2.5 History Pill ────────────────────────────────────────────────────
    // Kullanım: Arama çubuğu altında yatay scroll
    // Anatomy: Rounded pill, border, horizontal scroll
    pill: {
        flexShrink: 0,
        borderWidth: 1,
        borderRadius: RADIUS.pill,
        paddingHorizontal: 12,
        paddingVertical: 5,
        marginRight: 8,
    },
    pillText: {
        fontFamily: TYPOGRAPHY.families.sans,
        fontSize: 12,
    },

    // ─── 2.6 Section Label ───────────────────────────────────────────────────
    // Kullanım: İçerik bölümlerinin üst başlığı
    // Stili: UPPERCASE, letter-spacing: 1, semibold
    sectionLabel: {
        fontFamily: TYPOGRAPHY.families.sansSemiBold,
        fontSize: 11,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 14,
    },

    // ─── 2.7 Live Dot Indicator ──────────────────────────────────────────────
    // Kullanım: "SON DAKİKA" başlığı yanında
    // Boyut: 8x8, tam yuvarlak, animasyonlu pulse
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
})

// ═══════════════════════════════════════════════════════════════════════════════
// BÖLÜM 3: EKRAN LAYOUT'LARI (Screen Blueprints)
// ═══════════════════════════════════════════════════════════════════════════════

export const screenStyles = StyleSheet.create({

    // ─── 3.1 Home Screen Layout ──────────────────────────────────────────────
    homeContainer: {
        flex: 1,
    },
    homeHeader: {
        paddingHorizontal: SPACING.screenPadding,
        paddingTop: 20,
        paddingBottom: 28,
        borderBottomWidth: 1,
    },
    // Brand: "SCIO" — italic serif, uppercase, letter-spacing 2
    homeBrand: {
        fontFamily: TYPOGRAPHY.families.serifItalic,
        fontSize: 13,
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    // Hero Title: "Akademik okuma,\nana dilinizde."
    homeH1: {
        fontFamily: TYPOGRAPHY.families.serifBold,
        fontSize: 26,
        lineHeight: 32,
        marginBottom: 20,
    },
    // Section: News / HN / Evrim Ağacı / Öneriler
    homeSection: {
        padding: SPACING.screenPadding,
    },
    homeSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },

    // ─── 3.2 Results Screen Layout ───────────────────────────────────────────
    resultsContainer: {
        flex: 1,
    },
    // NavBar: [← Back] [Editable Search Pill] [Count]
    navBar: {
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 14,
        borderBottomWidth: 1,
        gap: 14,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    backArrow: {
        fontSize: 18,
        padding: 6,
    },
    queryPill: {
        flex: 1,
        borderWidth: 1,
        borderRadius: RADIUS.sm,
        paddingHorizontal: 14,
        height: 40,
        justifyContent: 'center',
    },
    resultsCount: {
        fontFamily: TYPOGRAPHY.families.sans,
        fontSize: 12,
    },
    // Results List: ScrollView → [News Results] → [Evrim Results] → [Academic Cards]
    resultsList: {
        flex: 1,
        padding: 20,
    },
    resultsSectionLabel: {
        fontFamily: TYPOGRAPHY.families.sansSemiBold,
        fontSize: 11,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginTop: 6,
    },
    loadMoreBtn: {
        borderWidth: 1.5,
        borderRadius: RADIUS.md,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 6,
    },
    loadMoreText: {
        fontFamily: TYPOGRAPHY.families.sansSemiBold,
        fontSize: 13,
        letterSpacing: 0.3,
    },

    // ─── 3.3 Detail Screen Layout ────────────────────────────────────────────
    detailContainer: {
        flex: 1,
    },
    // NavBar: [← Back] [SourceBadge] [Journal Name] [♥ Save] [⬇ Download]
    detailNavBar: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    detailBody: {
        paddingHorizontal: SPACING.screenPadding,
        paddingTop: 28,
        paddingBottom: 100,      // FAB butonunun altını açık bırak
        maxWidth: 600,
        alignSelf: 'center',
        width: '100%',
    },
    // Title: Serif Bold 22pt
    detailTitle: {
        fontFamily: TYPOGRAPHY.families.serifBold,
        fontSize: 22,
        lineHeight: 30,
        marginBottom: 14,
    },
    // Authors: Sans 13pt, muted
    detailAuthors: {
        fontFamily: TYPOGRAPHY.families.sans,
        fontSize: 13,
        marginBottom: 4,
    },
    // Year: Sans 12pt, subtle
    detailYear: {
        fontFamily: TYPOGRAPHY.families.sans,
        fontSize: 12,
        marginBottom: 22,
    },
    // Divider: 1px line
    detailDivider: {
        height: 1,
        marginBottom: 24,
    },
    // Abstract Box: Bordered card, serif italic
    abstractBox: {
        borderWidth: 1,
        borderRadius: RADIUS.sm,
        padding: 16,
        marginBottom: 16,
    },
    abstractLabel: {
        fontFamily: TYPOGRAPHY.families.sansSemiBold,
        fontSize: 11,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    abstractText: {
        fontFamily: TYPOGRAPHY.families.serifItalic,
        fontSize: 14,
        lineHeight: 24,
    },
    // Summarize Button: Burgundy filled, rounded
    summarizeBtn: {
        alignSelf: 'flex-start',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: RADIUS.sm,
    },
    summarizeBtnText: {
        fontFamily: TYPOGRAPHY.families.sansSemiBold,
        fontSize: 13,
        color: '#FFFFFF',
    },
    // Summary Card: Collapsible, bordered
    summaryCard: {
        borderWidth: 1,
        borderRadius: RADIUS.sm,
        padding: 16,
        marginTop: 16,
    },
    summaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryText: {
        fontFamily: TYPOGRAPHY.families.sans,
        fontSize: 14,
        lineHeight: 24,
        marginTop: 10,
    },
    // URL Link
    linkText: {
        fontFamily: TYPOGRAPHY.families.sansSemiBold,
        fontSize: 13,
        textDecorationLine: 'underline',
        marginTop: 20,
    },
    // Language Toggle FAB: Fixed bottom-right, dark bg, flag + text
    langToggle: {
        position: 'absolute',
        right: 20,
        bottom: 24,
        backgroundColor: '#1A1A1A',
        borderRadius: RADIUS.round,
        paddingHorizontal: 16,
        paddingVertical: 9,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        ...ELEVATION.fab,
    },
    langToggleText: {
        fontFamily: TYPOGRAPHY.families.sansSemiBold,
        fontSize: 12,
        color: COLORS.text.inverse,
        letterSpacing: 0.4,
    },

    // ─── 3.4 Tab Bar ─────────────────────────────────────────────────────────
    // Layout: 6 tab, eşit genişlik, icon + label
    // Tabs: Keşfet(⊞) | Gündem(📰) | HN(▲) | Bilim(🌿) | Kayıtlı(♡) | Ayarlar(⚙)
    tabBar: {
        flexDirection: 'row',
        borderTopWidth: 1,
        paddingBottom: 4,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        gap: 3,
    },
    tabIcon: {
        fontSize: 18,
    },
    tabLabel: {
        fontSize: 10,
    },

    // ─── 3.5 Center Box (Loading / Error / Empty) ────────────────────────────
    centerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.huge,
    },
    statusText: {
        fontFamily: TYPOGRAPHY.families.sansSemiBold,
        fontSize: 16,
        marginTop: 12,
        textAlign: 'center',
    },
    statusSubText: {
        fontFamily: TYPOGRAPHY.families.sans,
        fontSize: 13,
        marginTop: 6,
        textAlign: 'center',
        lineHeight: 20,
    },
    retryBtn: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: RADIUS.sm,
    },
    retryBtnText: {
        fontFamily: TYPOGRAPHY.families.sansSemiBold,
        fontSize: 13,
        color: '#FFFFFF',
    },
    errorText: {
        fontFamily: TYPOGRAPHY.families.sans,
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 10,
    },

    // ─── 3.6 Onboarding Screen ───────────────────────────────────────────────
    // Full-screen, centered layout
    // [Brand Logo] → [Title] → [Subtitle] → [Topic Grid] → [CTA Button]
    onboardingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.screenPadding,
    },
    onboardingTitle: {
        fontFamily: TYPOGRAPHY.families.serifBold,
        fontSize: 28,
        lineHeight: 36,
        textAlign: 'center',
        marginBottom: 12,
    },
    onboardingSubtitle: {
        fontFamily: TYPOGRAPHY.families.sans,
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 32,
    },
    // Topic chips: 2-column grid, selectable, toggleable
    topicGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
        marginBottom: 40,
    },
    topicChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: RADIUS.pill,
        borderWidth: 1.5,
    },
    topicChipSelected: {
        // backgroundColor: COLORS.brand.burgundy
        // borderColor: COLORS.brand.burgundy
    },
    topicChipText: {
        fontFamily: TYPOGRAPHY.families.sansMedium,
        fontSize: 14,
    },
    // CTA Button: Full-width, burgundy, large
    ctaButton: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: RADIUS.md,
        alignItems: 'center',
    },
    ctaButtonText: {
        fontFamily: TYPOGRAPHY.families.sansSemiBold,
        fontSize: 16,
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },

    // ─── 3.7 Settings Screen ─────────────────────────────────────────────────
    // ScrollView → Sections → Rows
    settingsSection: {
        paddingHorizontal: SPACING.screenPadding,
        paddingVertical: SPACING.xl,
        borderBottomWidth: 1,
    },
    settingsSectionTitle: {
        fontFamily: TYPOGRAPHY.families.sansSemiBold,
        fontSize: 11,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 16,
    },
    settingsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    settingsLabel: {
        fontFamily: TYPOGRAPHY.families.sans,
        fontSize: 15,
    },
    settingsValue: {
        fontFamily: TYPOGRAPHY.families.sansMedium,
        fontSize: 14,
    },

    // ─── 3.8 Saved Screen ────────────────────────────────────────────────────
    // Tab selector (Makaleler | HN | Evrim Ağacı | İndirilenler)
    // → Filtered list with swipe actions
    savedTabBar: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.screenPadding,
        paddingVertical: SPACING.md,
        gap: SPACING.sm,
    },
    savedTab: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: RADIUS.pill,
        borderWidth: 1,
    },
    savedTabActive: {
        // backgroundColor: COLORS.brand.burgundy
        // borderColor: COLORS.brand.burgundy
    },
    savedTabText: {
        fontFamily: TYPOGRAPHY.families.sansMedium,
        fontSize: 12,
    },
    // Status filter pills
    statusFilter: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.screenPadding,
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },

    // ─── 3.9 Offline Reader Screen ──────────────────────────────────────────
    // Full article view with original + translated text
    offlineHeader: {
        paddingHorizontal: SPACING.screenPadding,
        paddingVertical: SPACING.lg,
        borderBottomWidth: 1,
    },
    offlineTitle: {
        fontFamily: TYPOGRAPHY.families.serifBold,
        fontSize: 20,
        lineHeight: 28,
        marginBottom: 8,
    },
    offlineBody: {
        paddingHorizontal: SPACING.screenPadding,
        paddingTop: SPACING.xl,
        paddingBottom: 60,
    },
    offlineParagraph: {
        fontFamily: TYPOGRAPHY.families.sans,
        fontSize: 15,
        lineHeight: 26,
        marginBottom: SPACING.lg,
    },
    // Language toggle bar (Orijinal | Çeviri)
    langBar: {
        flexDirection: 'row',
        borderRadius: RADIUS.sm,
        overflow: 'hidden',
        borderWidth: 1,
        alignSelf: 'center',
        marginBottom: SPACING.xl,
    },
    langBarOption: {
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    langBarOptionActive: {
        // backgroundColor: COLORS.brand.burgundy
    },
    langBarText: {
        fontFamily: TYPOGRAPHY.families.sansSemiBold,
        fontSize: 12,
    },

    // ─── 3.10 WebView Screen ─────────────────────────────────────────────────
    webviewNavBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        gap: SPACING.md,
    },
    webviewTitle: {
        flex: 1,
        fontFamily: TYPOGRAPHY.families.sansMedium,
        fontSize: 13,
    },
    webviewContainer: {
        flex: 1,
    },
})

// ═══════════════════════════════════════════════════════════════════════════════
// BÖLÜM 4: ANİMASYON & İNTERAKSİYON TOKEN'LARI
// ═══════════════════════════════════════════════════════════════════════════════

export const ANIMATION = {
    // Geçiş süreleri
    duration: {
        instant:  100,    // Micro-interaction (press feedback)
        fast:     200,    // Tab değişimi, badge görünme
        normal:   300,    // Ekran geçişi, kart açılma
        slow:     500,    // Onboarding, ilk yükleme
    },

    // Easing
    easing: {
        standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
        accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
    },

    // Press feedback
    pressScale: 0.97,           // Basıldığında hafif küçülme
    pressOpacity: 0.85,         // Basıldığında hafif saydamlaşma

    // Live dot pulse
    liveDotPulse: {
        minScale: 0.8,
        maxScale: 1.2,
        duration: 1500,         // ms, tekrarlanan
    },
}

// ═══════════════════════════════════════════════════════════════════════════════
// BÖLÜM 5: EKRAN HARİTASI (Stitch İçin Sayfa Listesi)
// ═══════════════════════════════════════════════════════════════════════════════

export const SCREEN_MAP = {
    onboarding: {
        name: 'Onboarding — Hoş Geldin',
        description: 'İlk açılışta konu seçimi. Tam ekran, ortala, konu chip grid, CTA butonu.',
        sections: ['Brand Logo', 'Başlık', 'Alt Başlık', 'Konu Grid (2 sütun)', 'Devam Et Butonu'],
    },
    home: {
        name: 'Ana Sayfa — Keşfet',
        description: 'Editöryal ana sayfa. Üstte marka + arama, altında bölümlenmiş içerik feed\'i.',
        sections: [
            'Header (Brand + H1 + Search + Pills)',
            'Son Dakika — Gündem (kırmızı dot, haber listesi)',
            'Yeni Çıkanlar — HN (turuncu dot, story listesi)',
            'Evrim Ağacı — Bilim (yeşil icon, makale listesi)',
            'Sizin İçin Öneriler (akademik makale kartları)',
        ],
    },
    results: {
        name: 'Arama Sonuçları',
        description: 'Çoklu kaynak sonuçları. NavBar\'da düzenlenebilir arama, altında gruplu sonuçlar.',
        sections: [
            'NavBar (← + Arama Pill + Sonuç Sayısı)',
            'Haber Sonuçları bölümü',
            'Evrim Ağacı Sonuçları bölümü',
            'Akademik Makaleler (kart listesi)',
            'Daha Fazla Göster butonu',
        ],
    },
    detail: {
        name: 'Makale Detayı',
        description: 'Tek makalenin çevirili görünümü. Otomatik çeviri, özetleme, kaydetme.',
        sections: [
            'NavBar (← + Badge + Journal + ♥ + ⬇)',
            'Başlık (çevrilmiş)',
            'Yazarlar + Yıl',
            'Divider',
            'Abstract Kutusu (serif italic)',
            'Özetle Butonu + Özet Kartı',
            'Orijinal Makale Linki',
            'Dil Değiştir FAB (sağ alt)',
        ],
    },
    hn: {
        name: 'Hacker News',
        description: 'HN feed listesi. Feed seçici (top/new/best), tarih filtresi, story kartları.',
        sections: ['Feed Tab Bar', 'Tarih Filtresi', 'Story Listesi'],
    },
    hnReader: {
        name: 'HN Okuyucu',
        description: 'Tek HN story\'sinin detayı. Metadata bar + WebView.',
        sections: ['NavBar + Metadata', 'WebView İçerik'],
    },
    evrimagaci: {
        name: 'Evrim Ağacı — Bilim',
        description: 'Evrim Ağacı makale listesi. Kategori filtresi, kart listesi.',
        sections: ['Başlık', 'Kategori Filtreleri', 'Makale Kartları'],
    },
    news: {
        name: 'Gündem — Haberler',
        description: '4 kaynaktan haber akışı. Kaynak filtreleri, renkli etiketler.',
        sections: ['Başlık', 'Kaynak Filtreleri', 'Haber Kartları (kaynak renkli)'],
    },
    saved: {
        name: 'Kaydedilenler',
        description: 'Kaydedilen makaleler. Tab seçici, okuma durumu filtreleri, swipe.',
        sections: ['Tab Seçici', 'Durum Filtreleri', 'Makale/Story/Evrim Listesi', 'İndirilenler'],
    },
    settings: {
        name: 'Ayarlar',
        description: 'Uygulama ayarları. Bölümlenmiş toggle ve seçiciler.',
        sections: ['Kaynaklar', 'Tema', 'Çeviri Motoru', 'Çeviri Stili', 'API Anahtarı', 'Konular'],
    },
    offlineReader: {
        name: 'Çevrimdışı Okuyucu',
        description: 'İndirilen makalenin tam metni. Dil toggle bar, uzun body text.',
        sections: ['NavBar', 'Başlık', 'Dil Toggle Bar', 'Tam Metin'],
    },
    webview: {
        name: 'WebView Okuyucu',
        description: 'Harici URL\'yi uygulama içinde açar.',
        sections: ['NavBar (← + Title)', 'WebView'],
    },
}

// ─── Stitch İçin Notlar ─────────────────────────────────────────────────────
//
// 1. Tüm ekranlar 9:16 oranında, iOS/Android safe area ile.
// 2. Alt tab bar sabit — 6 sekme, aktif olanda brand rengi.
// 3. Kartlar border-radius: 12, ince border (1px), beyaz arka plan.
// 4. Marka dili: Gazete/dergi tarzı, sıcak krem tonları, serif başlıklar.
// 5. Her kaynak kendi renk koduyla etiketlenir (badge).
// 6. Dark mode'da tüm renkler tersine döner (surface + text).
// 7. FAB dil butonu yalnızca DetailScreen'de görünür (sağ alt, koyu).
// 8. Onboarding tam ekran, ortalanmış, chip grid seçimi.
// 9. Loading durumlarında ActivityIndicator + muted text.
// 10. Error durumlarında emoji (⚠️/📭) + mesaj + "Tekrar Dene" butonu.
//
// ─────────────────────────────────────────────────────────────────────────────
