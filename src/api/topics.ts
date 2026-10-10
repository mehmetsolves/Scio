// ─── Onboarding konuları ve akademik arama eşlemesi ──────────────────────────
//
// Kullanıcı onboarding'de Türkçe konu adı seçer ama akademik kaynaklar
// (arXiv, Semantic Scholar, OpenAlex) İngilizce. Arama doğrudan Türkçe konu
// adıyla yapılırsa sonuç çok zayıf kalıyor — canlı ölçüm:
//
//   Felsefe   → 0 sonuç      philosophy  → 5 sonuç
//   Psikoloji → 0 sonuç      psychology  → 5 sonuç
//   Teknoloji → 4 sonuç      technology  → 5 sonuç
//
// Bu yüzden her konu iki ad taşır: kullanıcıya gösterilen Etiket (Türkçe) ve
// akademik arama için kullanılan Sorgu (İngilizce). OnboardingScreen ve
// DiscoverScreen aynı listeyi kullanır; ikisi ayrı düşerse Keşfet sessizce
// boş sonuç üretir.

export interface TopicDef {
    label: string
    query: string
}

export const TOPICS: TopicDef[] = [
    { label: 'Teknoloji', query: 'technology' },
    { label: 'Bilim', query: 'science' },
    { label: 'Yapay Zeka', query: 'artificial intelligence' },
    { label: 'Felsefe', query: 'philosophy' },
    { label: 'Matematik', query: 'mathematics' },
    { label: 'Psikoloji', query: 'psychology' },
    { label: 'Tarih', query: 'history' },
    { label: 'Ekonomi', query: 'economics' },
    { label: 'Spor', query: 'sports' },
]

// Kayıtlı bir etiketten akademik arama terimini bulur. Bilinmeyen bir etiket
// (eski bir kurulumdan kalmışsa) İngilizce'ye yakın bir tahminle döner.
export function topicQuery(label: string): string {
    return TOPICS.find((t) => t.label === label)?.query ?? label.toLowerCase()
}
