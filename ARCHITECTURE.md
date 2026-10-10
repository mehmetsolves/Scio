# Scio — Uygulama Mimarisi & Mantık Dokümantasyonu

> **Son Güncelleme:** Ekim 2026  
> **Platform:** React Native (Expo SDK 54)  
> **Dil:** TypeScript  
>
> **Eski ad:** WordReads. Yeniden adlandırma sonrası depolama anahtarları
> `@wordreads_*` → `@scio_*` oldu; mevcut kullanıcı verisi tek seferlik taşıma
> ile korunuyor.

---

## 📋 İçindekiler

1. [Genel Bakış](#1-genel-bakış)
2. [Teknoloji Yığını](#2-teknoloji-yığını)
3. [Dosya & Klasör Yapısı](#3-dosya--klasör-yapısı)
4. [Uygulama Akış Diyagramı](#4-uygulama-akış-diyagramı)
5. [Ekranlar (Screens)](#5-ekranlar-screens)
6. [State Yönetimi (Context API)](#6-state-yönetimi-context-api)
7. [API Katmanı](#7-api-katmanı)
8. [Navigasyon Mantığı](#8-navigasyon-mantığı)
9. [Tema & Tasarım Sistemi](#9-tema--tasarım-sistemi)
10. [Veri Akışı Detayı](#10-veri-akışı-detayı)
11. [Offline Özellikler](#11-offline-özellikler)
12. [Güvenlik](#12-güvenlik)
13. [Performans Stratejileri](#13-performans-stratejileri)
14. [Gelecek Planları](#14-gelecek-planları)

---

## 1. Genel Bakış

**Scio**, akademik makaleleri, bilim haberlerini, teknoloji içeriklerini ve güncel haberleri **Türkçe'ye çevirerek** kullanıcıya sunan bir mobil okuma uygulamasıdır.

### Temel Değer Önerisi
- 🔬 **Akademik makaleler** → arXiv, Semantic Scholar, OpenAlex kaynaklarından arama
- 🌿 **Bilim içerikleri** → Evrim Ağacı RSS feed'inden canlı çekme
- 📰 **Güncel haberler** → BBC Türkçe, NTV, Sözcü, Hürriyet RSS feed'leri
- ▲ **Teknoloji haberleri** → Hacker News API entegrasyonu
- 🌐 **Otomatik çeviri** → İngilizce içerikleri Türkçe'ye anında çevirme
- 📝 **AI özetleme** → Makaleleri sadeleştirilmiş Türkçe ile özetleme
- 💾 **Offline okuma** → Makaleleri çevirisiyle birlikte indirip çevrimdışı okuma

### Kullanıcı Profili
Türkçe konuşan, akademik veya bilimsel içerikleri ana dilinde takip etmek isteyen öğrenciler, araştırmacılar ve meraklı okuyucular.

---

## 2. Teknoloji Yığını

| Katman | Teknoloji | Versiyon | Açıklama |
|--------|-----------|----------|----------|
| **Framework** | React Native (Expo) | SDK 54 | Çapraz platform mobil geliştirme |
| **Dil** | TypeScript | 5.7+ | Tip güvenli JavaScript |
| **React** | React | 19.1.0 | UI kütüphanesi |
| **Navigasyon** | Manuel state-based | - | React Navigation yerine custom çözüm |
| **State** | Context API | - | Global state yönetimi (3 context) |
| **Depolama** | AsyncStorage | 2.2.0 | Kalıcı veri saklama |
| **Güvenlik** | expo-secure-store | 15.0.8 | API anahtarları için güvenli depolama |
| **Fontlar** | expo-google-fonts | 0.2.3 | Source Serif 4 + Inter |
| **WebView** | react-native-webview | 13.15.0 | Tam makale görüntüleme |
| **Backend** | Cloudflare Workers | - | Arama, çeviri, özetleme proxy |

### Neden Bu Tercihler?

- **Expo**: EAS Build ile bulut derlemesi, Expo Go ile hızlı test
- **Context API (Redux yerine)**: Uygulama karmaşıklığı orta seviye; 3 bağımsız context yeterli
- **Manuel navigasyon**: React Navigation overhead'i olmadan hafif, tam kontrollü geçişler
- **Cloudflare Workers**: Edge'de çalışan, düşük gecikmeli API proxy

---

## 3. Dosya & Klasör Yapısı

```
scio/
├── App.tsx                          # Ana giriş noktası (~1150 satır)
│   ├── SourceBadge                  # Kaynak etiketi bileşeni
│   ├── ArticleCard                  # Makale kart bileşeni
│   ├── ResultsScreen                # Arama sonuçları
│   ├── DetailScreen                 # Makale detayı
│   ├── TabBar                       # Alt navigasyon çubuğu (4 sekme)
│   ├── AppInner                     # Ana uygulama kabı
│   └── App (default export)         # Root Provider sarmalayıcı
│
├── src/
│   ├── api/                         # API istemcileri
│   │   ├── client.ts                # Ana backend API (arama, çeviri, özetleme)
│   │   ├── rss.ts                   # RSS/XML ortak yardımcıları (parse + entity)
│   │   ├── hn.ts                    # Hacker News Firebase API
│   │   ├── evrimagaci.ts            # Evrim Ağacı RSS parser
│   │   └── news.ts                  # Türk haber kaynakları RSS parser
│   │
│   ├── screens/                     # Bağımsız ekran bileşenleri
│   │   ├── SettingsScreen.tsx       # Ayarlar ekranı
│   │   ├── SavedScreen.tsx          # Kaydedilen makaleler
│   │   ├── ProfileScreen.tsx        # Kullanıcı profili
│   │   ├── HNScreen.tsx             # Hacker News listesi
│   │   ├── HNReaderScreen.tsx       # HN makale okuyucu
│   │   ├── EvrimAgaciScreen.tsx     # Evrim Ağacı listesi
│   │   ├── NewsScreen.tsx           # Haber akışı
│   │   ├── ArticleWebViewScreen.tsx # WebView ile tam makale
│   │   ├── OnboardingScreen.tsx     # İlk açılış rehberi
│   │   └── OfflineReaderScreen.tsx  # Çevrimdışı okuyucu
│   │
│   ├── store/                       # Global state yönetimi
│   │   ├── SettingsContext.tsx       # Ayarlar (tema, motor, kaynaklar)
│   │   ├── SavedArticlesContext.tsx  # Kaydedilen makaleler
│   │   └── DownloadsContext.tsx      # İndirilen makaleler (offline)
│   │
│   └── theme/
│       └── colors.ts                # Renk paletleri (light/dark)
│
├── assets/                          # Görsel kaynaklar
│   ├── icon.png
│   ├── adaptive-icon.png
│   └── splash.png
│
├── plugins/
│   └── adi-registration/            # Expo config plugin
│
├── app.json                         # Expo yapılandırması
├── eas.json                         # EAS Build profilleri
├── package.json                     # Bağımlılıklar
└── tsconfig.json                    # TypeScript yapılandırması
```

---

## 4. Uygulama Akış Diyagramı

```
┌─────────────────────────────────────────────────────────────────────┐
│                         APP BAŞLATMA                                │
│                                                                     │
│  SettingsProvider → SavedArticlesProvider → DownloadsProvider        │
│                           │                                         │
│                      ┌────▼────┐                                    │
│                      │ AppInner │                                   │
│                      └────┬────┘                                    │
│                           │                                         │
│              ┌────────────▼────────────┐                            │
│              │  Font + Settings yüklü? │                            │
│              └────────┬───────────────┘                             │
│                       │                                             │
│            Hayır ─────┤────── Evet                                  │
│              │        │        │                                    │
│           (null)      │   ┌────▼──────────────┐                     │
│                       │   │ Onboarding tamamlı?│                    │
│                       │   └────┬──────────────┘                     │
│                       │        │                                    │
│                    Hayır ──────┤────── Evet                         │
│                       │        │        │                           │
│              ┌────────▼──┐     │  ┌─────▼──────┐                    │
│              │ Onboarding │    │  │ NewsScreen │                    │
│              │  (Konu seç)│    │  │  + TabBar  │                    │
│              └────────────┘    │  └────────────┘                    │
└─────────────────────────────────────────────────────────────────────┘
```

> **Önemli:** Uygulama açılışta doğrudan **Gündem** (`news`) ekranına gider.
> Ayrı bir "Home / Keşfet" ekranı **yoktur** — `Screen` tipinde `'home'` değeri
> bulunmaz. Aşağıdaki navigasyon grafiği gerçek kodu yansıtır.

### Navigasyon Akışı

```
NewsScreen (Gündem) ──┬── [Arama çubuğu] ──→ ResultsScreen ──→ DetailScreen
   ▲                  │                                          │
   │                  ├── [İlgi alanı çipi] → ResultsScreen       │
   │                  │                                          │
   │                  ├── [Profil ikonu] ──→ ProfileScreen        │
   │                  │                                          │
   │                  └── [Ayarlar ikonu] ─→ SettingsScreen       │
   │                                                             │
   │   DetailScreen ──┬── [Orijinali Gör] → ArticleWebViewScreen  │
   │                  ├── [Kaydet 🔖] ────→ SavedArticles         │
   │                  ├── [İndir ⬇] ──────→ Downloads             │
   │                  ├── [Çevir 🇹🇷/🇬🇧] ──→ API Translate        │
   │                  └── [Özetle 📝] ────→ API Summarize         │
   │                                                             │
   │   HNScreen ──────→ HNReaderScreen ──→ WebView / metin        │
   │   EvrimAgaciScreen ──→ ArticleWebViewScreen                  │
   │   NewsScreen kartı ──→ ArticleWebViewScreen                  │
   │                                                             │
   └── TabBar ──┬── Gündem (📰) ────→ NewsScreen                  │
                ├── HN (▲) ─────────→ HNScreen                   │
                ├── Bilim (🔭) ─────→ EvrimAgaciScreen           │
                └── Kayıtlı (🔖) ───→ SavedScreen                 │
                                     └── [Offline kart] → OfflineReaderScreen
```

---

## 5. Ekranlar (Screens)

### 5.1 OnboardingScreen — İlk Açılış

**Amaç:** Kullanıcının ilgi alanlarını seçmesi, kişiselleştirilmiş öneri akışı oluşturma.

**Mantık:**
1. Kullanıcıya konu listesi gösterilir (AI, fizik, biyoloji, vs.)
2. Seçilen konular `SettingsContext.selectedTopics`'e yazılır
3. `hasCompletedOnboarding = true` → AsyncStorage'a kaydedilir
4. Bir daha gösterilmez (persist edildiği için)

```
Kullanıcı → Konu Seç → [Devam Et] → selectedTopics kaydedilir
                                    → hasCompletedOnboarding = true
                                    → Gündem (NewsScreen) açılır
```

Seçilen konular bir daha **Gündem ekranında çip olarak** görünür ve tek
dokunuşla o konuda arama başlatır (bkz. 5.8). Önceden toplanıp hiç
kullanılmıyordu.

---

### 5.2 Gündem — Ana Ekran (NewsScreen)

**Amaç:** Uygulamanın açılış ekranı. Türk haber RSS akışı + arama girişi +
ilgi alanı kısayolları.

**Bölümler (Yukarıdan Aşağıya):**

| Sıra | Bölüm | Kaynak | İçerik |
|------|-------|--------|--------|
| 1 | **Başlık + Profil/Ayarlar** | - | "Gündem" başlığı, iki ikon buton |
| 2 | **Arama çubuğu** | - | Akademik arama başlatır (ResultsScreen) |
| 3 | **İlgi alanı çipleri** | Onboarding | `selectedTopics` — varsa gösterilir, tek dokunuşla arar |
| 4 | **Kaynak filtresi** | BBC, NTV, Sözcü, Hürriyet | Haber akışını kaynağa göre filtreler |
| 5 | **Haber kartları** | 4 RSS | Kaynak renk şeridi + başlık + özet + indir butonu |

**Veri Yükleme:**
```typescript
useEffect(() => {
    fetchAllNews() → setArticles   // 4 RSS paralel, Promise.allSettled
}, [])
```

**Arama Mekanizması:**
1. Kullanıcı arama çubuğuna yazar → `query` state güncellenir
2. Enter/Submit → `onSearch(query)` → `ResultsScreen`'e geçiş
3. İlgi alanı çipine tıklanırsa → direkt `onSearch(topic)`

---

### 5.3 ResultsScreen — Arama Sonuçları

**Amaç:** Çoklu kaynaktan gelen sonuçları birleşik gösterme.

**3 Paralel Arama:**
```
query ──┬── searchArticles(query, sources) → Akademik makaleler (arXiv, SS, OA)
        ├── searchEvrimAgaci(query)         → Evrim Ağacı makaleleri
        └── fetchAllNews() + filterNews()   → Haber sonuçları
```

**Sonuç Sıralaması:**
1. 📰 Haber sonuçları (en üstte)
2. 🌿 Evrim Ağacı sonuçları
3. 📄 Akademik makaleler

**Sayfalama (Pagination):**
- Akademik makaleler için `page` state'i tutulur
- "Daha Fazla Göster" butonu → `loadMore()` → `searchArticles(query, sources, nextPage)`
- Yeni sonuçlar mevcut listeye eklenir (`[...prev, ...data]`)

**Canlı Arama Düzenleme:**
- Navbar'daki arama çubuğu `TextInput` olarak düzenlenebilir
- Submit edildiğinde → `onSearch(newQuery)` → tüm sonuçlar yenilenir

---

### 5.4 DetailScreen — Makale Detayı

**Amaç:** Tek bir akademik makalenin çevirili detay görünümü.

**Otomatik Çeviri Akışı:**
```
Ekran açılır
    │
    ├── translating = true
    │
    ├── Promise.all([
    │       translateText(article.title),
    │       translateText(article.abstract)
    │   ])
    │
    ├── Başarılı → titleTr, abstractTr set edilir → lang = 'tr'
    │            → Zaten kaydedilmişse → çeviri cache güncellenir
    │
    └── Başarısız → translateError gösterilir
```

**Dil Değiştirme (FAB Butonu):**
```
[🇹🇷 Türkçe] ←→ [🇬🇧 English]

Sağ altta yüzen buton:
- Mevcut dil TR ise → EN'ye geçer (orijinal gösterilir)
- Mevcut dil EN ise → TR'ye geçer (çevrisi gösterilir)
- Çeviri henüz tamamlanmadıysa → buton devre dışı
```

**AI Özetleme:**
```
[📝 Özetle] butonu
    │
    ├── engine === 'mymemory' → Alert("Motor uyumsuz, AI motor seç")
    │
    └── summarizeText(article.abstract, {engine, apiKey})
        ├── Başarılı → summary gösterilir (collapsible kart)
        └── Başarısız → summaryError
```

**Kaydetme & İndirme:**
- ♥/♡ → `toggleSave(article, titleTr, abstractTr)` — çeviriyle birlikte kaydeder
- ⬇ → `downloadArticle(meta)` — tam içeriği çekip çevirerek offline saklar
- ✅ → Zaten indirilmiş göstergesi

---

### 5.5 HNScreen — Hacker News

**Feed Tipleri:** `top` | `new` | `best`

**Akış:**
1. Seçilen feed'e göre `fetchStoryIds(feed)` → story ID listesi
2. ID'ler batch halinde `fetchItems(ids)` ile çekilir
3. Opsiyonel tarih filtresi: `all` | `today` | `week` | `month`
4. Bir story'ye tıklama → `HNReaderScreen`

---

### 5.6 HNReaderScreen — HN Makale Okuyucu

- Seçilen HN story'nin URL'si WebView'da açılır
- Story metadata (score, yazar, yorum sayısı) üstte gösterilir
- Kaydetme (♡/♥) desteği

---

### 5.7 EvrimAgaciScreen — Evrim Ağacı

- `evrimagaci.org/rss.xml` → RSS XML parse edilir (custom parser, harici bağımlılık yok)
- Kategorilere göre filtreleme
- Tıklama → WebView'da tam makale

---

### 5.8 NewsScreen — Gündem / Haberler

**4 Kaynak (Paralel Fetch):**

| Kaynak | RSS URL | Renk |
|--------|---------|------|
| BBC Türkçe | `feeds.bbci.co.uk/turkce/rss.xml` | 🔴 Kırmızı |
| NTV | `ntv.com.tr/gundem.rss` | 🔵 Lacivert |
| Sözcü | `sozcu.com.tr/feeds-rss-category-gundem` | 🟠 Turuncu |
| Hürriyet | `hurriyet.com.tr/rss/anasayfa` | 🔵 Mavi |

**Akış:**
```
fetchAllNews() → Promise.allSettled([
    fetchNewsFromSource(bbc),
    fetchNewsFromSource(ntv),
    fetchNewsFromSource(sozcu),
    fetchNewsFromSource(hurriyet),
]) → Tarihe göre sıralama → Göster
```

---

### 5.9 SavedScreen — Kaydedilen Makaleler

**3 Kategori:**
- 📄 Akademik makaleler (`SavedArticleEntry[]`)
- ▲ HN story'leri (`SavedHNEntry[]`)
- 🌿 Evrim Ağacı makaleleri (`SavedEvrimEntry[]`)

**Okuma Durumu (Reading Status):**
```typescript
type ReadingStatus = 'unread' | 'read_liked' | 'read_disliked'
```

- Swipe veya butonla durum değiştirilebilir
- Durum bazlı filtreleme: `getArticlesByStatus('unread')`

**Çeviri Cache:**
- Kaydedilen akademik makalelerin `titleTr` ve `abstractTr` değerleri saklanır
- Tekrar açıldığında çeviri API'si çağrılmaz → hızlı yükleme

---

### 5.10 SettingsScreen — Ayarlar

**Yapılandırılabilir Değerler:**

| Ayar | Tip | Varsayılan | Seçenekler |
|------|-----|------------|------------|
| Akademik Kaynaklar | `SourceName[]` | Tümü | arXiv, Semantic Scholar, OpenAlex |
| Karanlık Mod | `boolean` | `false` | Açık / Kapalı |
| Çeviri Motoru | `Engine` | `mymemory` | MyMemory, Anthropic, OpenAI, Groq, Gemini |
| Çeviri Stili | `TranslationStyle` | `academic` | Akademik / Basit |
| API Anahtarı | `string` | `''` | Kullanıcı girer (güvenli depolama) |
| Seçili Konular | `string[]` | `[]` | Onboarding'de seçilen konular |

---

### 5.11 ArticleWebViewScreen — WebView Okuyucu

- Harici URL'leri uygulama içinde açar (tarayıcıya yönlendirmez)
- Geri butonu → önceki ekrana dönüş
- Başlık navbar'da gösterilir

---

### 5.12 OfflineReaderScreen — Çevrimdışı Okuyucu

- `DownloadsContext`'ten çekilen `DownloadedArticle` gösterilir
- Orijinal dil + çeviri yan yana veya toggle ile gösterilir
- İnternet bağlantısı gerektirmez

---

## 6. State Yönetimi (Context API)

### 6.1 Provider Hiyerarşisi

```
<SettingsProvider>           ← En dış katman
  <SavedArticlesProvider>    ← Settings'e bağımlı değil ama aynı seviye
    <DownloadsProvider>      ← Settings'e bağımlı (engine, style, apiKey)
      <AppInner />
    </DownloadsProvider>
  </SavedArticlesProvider>
</SettingsProvider>
```

### 6.2 SettingsContext

**Sorumluluk:** Uygulama geneli kullanıcı tercihleri.

```typescript
interface SettingsState {
    sources: SourceName[]          // Aktif akademik kaynaklar
    darkMode: boolean              // Tema tercihi
    engine: Engine                 // Çeviri/özetleme motoru
    style: TranslationStyle        // Çeviri stili
    apiKey: string                 // AI motor API anahtarı
    selectedTopics: string[]       // Kişisel ilgi alanları
    hasCompletedOnboarding: boolean // Onboarding tamamlandı mı
    ready: boolean                 // Veriler yüklendi mi
}
```

**Persist Stratejisi:**
- Genel ayarlar → `AsyncStorage` (`@scio_settings`)
- API anahtarı → `expo-secure-store` (şifrelenmiş depolama)
- Her değişiklikte → mevcut değerler okunur, patch uygulanır, yazılır

### 6.3 SavedArticlesContext

**Sorumluluk:** Kaydedilen makalelerin yönetimi (3 tip).

```typescript
// Her tip için ayrı entry yapısı
interface SavedArticleEntry {
    article: Article
    status: ReadingStatus    // 'unread' | 'read_liked' | 'read_disliked'
    savedAt: number          // Unix timestamp
    titleTr?: string         // Cached çeviri
    abstractTr?: string      // Cached çeviri
}
```

**Legacy Migration:**
- v1 formatı (düz Article[]) → v2 formatına (entry-based) otomatik geçiş
- İlk yüklemede eski format algılanır → status: 'unread' ile sarmalanır

### 6.4 DownloadsContext

**Sorumluluk:** Çevrimdışı okuma için indirilen tam makaleler.

**İndirme Akışı:**
```
downloadArticle(meta)
    │
    ├── 1. extractArticle(url) → Tam metin çıkarma (backend)
    │
    ├── 2. detectOrigLang(source) → Kaynak dili belirle (tr/en)
    │
    ├── 3. Promise.all([
    │       translateTo(title),
    │       translateTo(description),
    │       translateTo(body)         ← Body chunklanarak çevrilir
    │   ])
    │
    └── 4. AsyncStorage'a entry olarak kaydet
         ├── Index: ID listesi (hafif)
         └── Entry: Ayrı key/value (büyük veri)
```

**Chunked Çeviri:**
- MyMemory API'si istek başına 1000 karakter limiti var
- Uzun metinler 1000'er karakterlik parçalara bölünür
- Her parça paralel çevrilir → sonuçlar birleştirilir

**Depolama Stratejisi (Android AsyncStorage Limiti):**
```
@scio_downloads_index    → ["id1", "id2", "id3"]     (hafif)
@scio_download_id1       → { ...DownloadedArticle }   (ağır, ayrı)
@scio_download_id2       → { ...DownloadedArticle }   (ağır, ayrı)
```

---

## 7. API Katmanı

### 7.1 Ana Backend (Cloudflare Worker)

**Base URL:** `https://wordreads-worker.yildirimmehmed21.workers.dev`

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/search` | GET | Akademik makale arama |
| `/api/translate` | POST | Metin çevirisi |
| `/api/summarize` | POST | AI ile özetleme |
| `/api/extract` | POST | URL'den makale metni çıkarma |

**Arama Parametreleri:**
```
GET /api/search?q=transformers&sources=arxiv,semanticscholar&page=1
```

**Çeviri İsteği:**
```json
POST /api/translate
{
    "text": "...",
    "sourceLang": "en",
    "targetLang": "tr",
    "style": "academic",      // veya "simple"
    "engine": "mymemory",     // veya "anthropic", "openai", "groq", "gemini"
    "apiKey": "sk-..."        // opsiyonel (mymemory hariç)
}
```

### 7.2 Hacker News API

**Base:** `https://hacker-news.firebaseio.com/v0`

- `/topstories.json` → En popüler story ID'leri
- `/newstories.json` → En yeni story ID'leri
- `/beststories.json` → En iyi story ID'leri
- `/item/{id}.json` → Tek story detayı

**Batch Fetch:** `Promise.allSettled()` ile paralel çekme, hatalı olanlar atlanır.

### 7.3 RSS Parse (Evrim Ağacı + Haberler)

**Harici bağımlılık yok** — `src/api/rss.ts` içindeki ortak yardımcılar:

```typescript
export function extractTag(xml, tag): string          // tag içeriği + CDATA soyma
export function extractAttribute(xml, tag, attr)      // media:content url="..."
export function stripHtml(html): string               // HTML temizle + entity çöz
export function makeStableId(prefix, link): string    // djb2 hash → kararlı ID
```

`evrimagaci.ts` ve `news.ts` bu modülü paylaşır. Önceden üç fonksiyonun
birebir kopyası iki dosyada duruyordu; tek yerde toplandı.

**Entity çözmede iki incelik:**
- **Sıra:** isimli entity'ler (`&amp;`) sayısal olanlardan (`&#8217;`) **önce**
  çözülür. Ters sırada isimli kurallar, sayısal kural çalıştıktan sonraki
  metne uygulanır ve `&#038;` gibi çift-kodlanmış girdiler yanlış sonuç verir.
- **`fromCodePoint`, `fromCharCode` değil:** `fromCharCode` kod noktasını
  16 bite kestiği için `&#128512;` gibi astral düzlem karakterleri (emoji)
  bozulur.

**Neden harici parser kullanılmadı?**
- React Native'de XML parser'lar sorunlu olabiliyor
- RSS yapısı basit ve sabit → custom çözüm yeterli
- Bundle boyutu azaltılmış

---

## 8. Navigasyon Mantığı

### Custom State-Based Navigation

React Navigation kullanılmıyor. Navigasyon tamamen `screen` state'i ile yönetiliyor:

```typescript
type Screen = 'results' | 'detail' | 'settings' | 'saved' | 'profile' |
              'hn' | 'hnReader' | 'webview' | 'evrimagaci' | 'news' |
              'offlineReader'

const [screen, setScreen] = useState<Screen>('news')   // açılış: Gündem
```

### Geri Butonu Mantığı

```typescript
const handleBack = () => {
    if (screen === 'detail')        → 'results' veya 'saved' (prevTab'a göre)
    if (screen === 'results')       → 'news'
    if (screen === 'hnReader')      → 'hn'
    if (screen === 'webview')       → prevScreen (dinamik)
    if (screen === 'offlineReader') → 'saved'
    if (screen === 'settings')      → prevTab
    else                            → 'news'
}
```

### Android Hardware Back Button

```typescript
useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', () => {
        if (screen === 'news') return false  // Uygulamadan çıkışa izin ver
        handleBack()
        return true                          // Çıkışı engelle
    })
}, [screen])
```

### Tab Bar

Dört sekme vardır ve tab bar yalnızca bu ekranlarda gösterilir:

```typescript
type TabId = 'news' | 'hn' | 'evrimagaci' | 'saved'
const showTab = ['news', 'hn', 'evrimagaci', 'saved'].includes(screen)
```

**Ayarlar ve Profil sekme değildir** — Gündem başlığındaki iki ikon butondan
açılır (`onOpenSettings` / `onOpenProfile`).
```

---

## 9. Tema & Tasarım Sistemi

### Renk Paleti

| Token | Light | Dark | Kullanım |
|-------|-------|------|----------|
| `cream` | `#FAF7F2` | `#121212` | Ana arkaplan |
| `ink` | `#1A1A1A` | `#E8E4DF` | Birincil metin |
| `burgundy` | `#7C1D2E` | `#D4637A` | Marka rengi, vurgular |
| `navy` | `#1B2B4B` | `#8BA4D0` | İkincil vurgu |
| `card` | `#FFFFFF` | `#1E1C1A` | Kart arkaplanı |
| `border` | `#E4DED6` | `#2A2725` | Çerçeve, ayırıcılar |

### Tipografi

| Font | Kullanım |
|------|----------|
| `SourceSerif4_700Bold` | Başlıklar (h1, detail title) |
| `SourceSerif4_600SemiBold` | Kart başlıkları |
| `SourceSerif4_400Regular_Italic` | Abstracts, brand |
| `Inter_600SemiBold` | Butonlar, etiketler |
| `Inter_500Medium` | Orta ağırlık UI metinleri |
| `Inter_400Regular` | Genel body text |

### Tasarım İlkeleri

1. **Editöryal stil** — Gazete/dergi estetiği (serif fontlar, temiz layout)
2. **Minimal ama sıcak** — Krem tonları, burgundy aksanlar
3. **Kaynak renk kodlaması** — Her içerik kaynağının kendine ait rengi var
4. **Responsive kartlar** — `compact` prop ile farklı boyutlar

---

## 10. Veri Akışı Detayı

### Tam Kullanıcı Senaryosu: "Bir makale aramak ve okumak"

```
1. Kullanıcı Gündem ekranında arama çubuğuna "yapay zeka" yazar
   │
2. handleSubmit() → onSearch("yapay zeka")
   │
3. AppInner: setQuery("yapay zeka"), setScreen('results')
   │
4. ResultsScreen mount olur:
   │
   ├── useEffect #1: searchArticles("yapay zeka", sources, 1)
   │   → API: GET /api/search?q=yapay+zeka&sources=arxiv,semanticscholar,openalex&page=1
   │   → Response: { articles: [...] }
   │   → setArticles(data)
   │
   ├── useEffect #2: searchEvrimAgaci("yapay zeka")
   │   → fetch RSS → parse → filter by query
   │   → setEvrimResults(filtered)
   │
   └── useEffect #3: fetchAllNews() + filterNews(all, "yapay zeka")
       → fetch 4 RSS feed → parse → filter
       → setNewsResults(filtered)
   │
5. Kullanıcı bir akademik makaleye tıklar
   │
6. onArticle(article) → AppInner: setArticle(a), setScreen('detail')
   │
7. DetailScreen mount olur:
   │
   ├── useEffect: Otomatik çeviri
   │   → Promise.all([
   │       translateText(title, {style, engine, apiKey}),
   │       translateText(abstract, {style, engine, apiKey})
   │   ])
   │   → titleTr, abstractTr set edilir
   │   → lang = 'tr' (varsayılan olarak Türkçe gösterilir)
   │
   ├── Kullanıcı [📝 Özetle]'ye tıklar
   │   → summarizeText(abstract, {engine, apiKey})
   │   → summary gösterilir
   │
   ├── Kullanıcı [♡]'ya tıklar → toggleSave(article, titleTr, abstractTr)
   │   → AsyncStorage'a kaydedilir
   │
   └── Kullanıcı [⬇]'ya tıklar → downloadArticle(meta)
       → extractArticle(url) → metin çıkar
       → translateTo(title + desc + body) → chunk'lanmış çeviri
       → AsyncStorage'a offline kayıt
```

---

## 11. Offline Özellikler

### Ne Çevrimdışı Çalışır?

| Özellik | Offline | Açıklama |
|---------|---------|----------|
| İndirilen makaleleri okuma | ✅ | DownloadsContext'ten yüklenir |
| Kaydedilen makalelerin listesi | ✅ | AsyncStorage'dan |
| Ayarları görme/değiştirme | ✅ | AsyncStorage'dan |
| Arama yapma | ❌ | Backend API gerektirir |
| Çeviri/özetleme | ❌ | Backend API gerektirir |
| RSS feed'ler (HN, Evrim Ağacı) | ❌ | İnternet gerektirir |

### İndirme Limitleri

- Makale body'si max **30.000 karakter** ile sınırlı
- Her entry ayrı AsyncStorage key'inde saklanır (Android limit aşımını önler)

---

## 12. Güvenlik

| Veri | Depolama | Açıklama |
|------|----------|----------|
| Kullanıcı ayarları | `AsyncStorage` | Şifresiz, hassas değil |
| API anahtarı | `expo-secure-store` | Cihaz keychain'inde şifreli |
| Makale verileri | `AsyncStorage` | Şifresiz, hassas değil |

**API Anahtarı Akışı:**
```
Kullanıcı girer → SecureStore.setItemAsync(key)
Uygulama açılır → SecureStore.getItemAsync(key) → state'e yükle
Kullanıcı siler → SecureStore.deleteItemAsync(key)
```

### Yeniden Adlandırma Taşıması (WordReads → Scio)

Depolama anahtarları `@wordreads_*` → `@scio_*` ve secure-store anahtarı
`wordreads_api_key` → `scio_api_key` olarak değişti. Mevcut kullanıcıların
verisi kaybolmasın diye üç context'te tek seferlik, **idempotent** taşıma var:

```
SettingsContext.migrateLegacyKeys()      → @wordreads_settings, wordreads_api_key
SavedArticlesContext.migrateRenamedKeys() → 3 kayıt anahtarı
DownloadsContext.migrateDownloadedArticles() → index + entry başına anahtar
```

Kural her yerde aynı: eski anahtar varsa okunur, yeni anahtar boşsa oraya
yazılır, artık silinir. İkinci açılışta eski anahtar bulunmaz → hiçbir şey
yapılmaz. `DownloadsContext` entry başına bir anahtar kullandığı için index
listeleyip her kaydı tek tek taşır.

---

## 13. Performans Stratejileri

1. **Paralel veri çekme:** Gündem ve Arama ekranlarında kaynaklar aynı anda fetch edilir (`Promise.allSettled`)
2. **Lazy loading:** Ekranlar yalnızca `screen === 'X'` olduğunda render olur
3. **Çeviri cache:** Kaydedilen makalelerin çevirileri tekrar istenmez
4. **Batch fetch:** HN story'leri tek tek değil, `Promise.allSettled()` ile toplu
5. **RSS parse (harici dep yok):** Bundle boyutu küçük tutulur
6. **Chunked çeviri:** Uzun metinler parçalanarak API limitlerine uyulur
7. **Cancelled flag:** `useEffect` cleanup'ta iptal flag'i ile race condition önleme

---

## 14. Gelecek Planları

- [ ] Push notification ile günlük öneri
- [ ] Çevrimdışı RSS cache (son feed'i sakla)
- [ ] Okuma istatistikleri ve grafikler
- [ ] Makale paylaşma (deep linking)
- [ ] Sesli okuma (TTS entegrasyonu)
- [ ] Widget desteği (Android)
- [ ] iPad/tablet optimizasyonu
- [ ] Backend'e gerçek kullanıcı hesabı sistemi

---

## Notlar

- `App.tsx` (~1150 satır) hâlâ iki ekran (Results, Detail) ve `TabBar`'ı
  barındırıyor; geri kalan ekranlar `src/screens/` altında. Tümünü taşımak
  mümkün ama şu an çalışan bir denge.
- Backend Cloudflare Worker olarak deploy edilmiş. Kaynak kodu bu repo'da
  değil. **Uygulama Scio adına geçti ama Worker hâlâ eski adresinde
  (`wordreads-worker.yildirimmehmed21.workers.dev`);** Worker yeniden deploy
  edilene kadar `src/api/client.ts` içindeki URL değiştirilmemeli, aksi halde
  arama/çeviri/özetleme tamamen durur.
- Font'lar ağdan yükleniyor (`@expo-google-fonts`). Tamamen offline ilk açılış
  için `assets/fonts/` altına taşınıp `expo-font` ile yerelden yüklenebilir.
- `DESIGN_STITCH_REFERENCE.ts` kod tarafından import **edilmiyor** — Stitch'e
  girdi olarak hazırlanmış bir token referansı; çalışma zamanında kullanılmıyor.
- Test altyapısı yok; tip güvenliği `npx tsc --noEmit` ile sağlanıyor.
