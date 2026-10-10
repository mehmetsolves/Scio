// ─── Light & Dark color palettes ─────────────────────────────────────────────

export interface ColorScheme {
    cream: string
    ink: string
    burgundy: string
    burgundyTint: string
    navy: string
    muted: string
    mutedLight: string
    border: string
    card: string
    pressedCard: string
    inputBorder: string
    abstractBg: string
    abstractText: string
    cardAbstract: string
}

export const lightColors: ColorScheme = {
    cream: '#FAF7F2',
    ink: '#1A1A1A',
    burgundy: '#7C1D2E',
    burgundyTint: 'rgba(124,29,46,0.08)',
    navy: '#1B2B4B',
    muted: '#6B6560',
    mutedLight: '#A09890',
    border: '#E4DED6',
    card: '#FFFFFF',
    pressedCard: '#F5F0EA',
    inputBorder: '#C8BFB5',
    abstractBg: '#F5F0EA',
    abstractText: '#2A2520',
    cardAbstract: '#4A4540',
}

export const darkColors: ColorScheme = {
    cream: '#121212',
    ink: '#E8E4DF',
    burgundy: '#D4637A',
    burgundyTint: 'rgba(212,99,122,0.12)',
    navy: '#8BA4D0',
    muted: '#9E9A95',
    mutedLight: '#6B6560',
    border: '#2A2725',
    card: '#1E1C1A',
    pressedCard: '#262320',
    inputBorder: '#3A3632',
    abstractBg: '#1E1C1A',
    abstractText: '#D0CBC5',
    cardAbstract: '#B0AAA4',
}

export const SOURCE_META = {
    arxiv: { label: 'arXiv', color: '#7C1D2E', bg: '#F5E8EB' },
    semanticscholar: { label: 'Semantic Scholar', color: '#1B2B4B', bg: '#E8EDF5' },
    openalex: { label: 'OpenAlex', color: '#2D5016', bg: '#EBF2E8' },
    evrimagaci: { label: 'Evrim Ağacı', color: '#2D8C3E', bg: '#E8F5E9' },
} as const

export type SourceKey = keyof typeof SOURCE_META
