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
   └── TabBar ──┬── Keşfet (📚) ─────→ DiscoverScreen              │
                ├── Bilim (🔭) ─────→ EvrimAgaciScreen           │
                ├── Teknoloji (▲) ──→ HNScreen                   │
                └── Gündem (📰) ─────→ NewsScreen                 │
                                     └── [Offline kart] → OfflineReaderScreen

   ┌──────────────────────────────────────────────────────────┐
   │  Hamburger menü (☰ — her sekme ekranında sağ üstte)      │
   │    ├── Kayıtlılar ──→ SavedScreen                        │
   │    ├── Ayarlar ─────→ SettingsScreen                      │
   │    └── Profil ──────→ ProfileScreen                       │
   └──────────────────────────────────────────────────────────┘
```

**Alt bar dört sabit sekmeden** oluşur. Kayıtlılar, Ayarlar ve Profil
artık sekme değildir — hamburger menüden açılır. Ayarlar → **Kategoriler**
bölümünden Bilim/Teknoloji/Gündem sekmeleri kapatılabilir (Keşfet sabittir).

### Arama davranışı

Her sekme **kendi türünü** arar; sonuçlar karışmaz:

| Arama yapılan yer | `mode` | Sonuçlar |
|---|---|---|
| Keşfet / ilgi alanı çipleri | `academic` | arXiv, Semantic Scholar, OpenAlex (+ Evrim Ağacı) |
| Gündem arama çubuğu | `news` | Türk haber RSS'leri (gömülü + özel kaynaklar) |
| Teknoloji arama çubuğu | istemci filtresi | Yüklenmiş HN öğeleri (başlık/domain/yazar) |

Geri dönüş her zaman aramanın **yapıldığı sekmeye** gider
(`searchOrigin`), sabit olarak Gündem'e değil.

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
                                    → Keşfet (DiscoverScreen) açılır
```

Seçilen konular bu keşfet akışını besler. Önceden toplanıp hiçbir yerde
kullanılmıyordu.

---

### 5.2 Keşfet — Ana Ekran (DiscoverScreen)

**Amaç:** Uygulamanın açılış ekranı. Onboarding'de seçilen ilgi alanlarına
göre akademik makale akışı.

**Bölümler (Yukarıdan Aşağıya):**

| Sıra | Bölüm | Kaynak | İçerik |
|------|-------|--------|--------|
| 1 | **Başlık + Menü** | - | "Makaleler" başlığı, hamburger menü (☰) |
| 2 | **Konu başlıkları** | Onboarding | Seçilen her ilgi alanı için ayrı bölüm |
| 3 | **Akademik kartlar** | arXiv, SS, OpenAlex | O konuya dair makaleler |

**Önemli — Türkçe/İngilizce eşlemesi:**
Onboarding konuları Türkçe gösterilir ama akademik kaynaklar İngilizce'dir.
Doğrudan Türkçe konuyla arama yapılırsa sonuç çok zayıf kalıyor:

| Sorgu | Sonuç |
|---|---|
| "Psikoloji" | 0 |
| "Felsefe" | 0 |
| "Teknoloji" | 4 |
| "psychology" / "philosophy" / "technology" | 5 / 5 / 5 |

Bu yüzden `src/api/topics.ts` her konu için **hem** kullanıcıya görünen
etiketi (Türkçe) **hem** akademik arama terimini (İngilizce) tutar.
`OnboardingScreen` ve `DiscoverScreen` aynı listeyi kullanır; ikisi
ayrışırsa Keşfet sessizce boş sonuç üretir.

**Performans:** ilk **3 konu** paralel yüklenir (her konu için ayrı
`searchArticles` çağrısı). Daha fazla konu seçilse bile başlangıç ekranı
kontrolsüz sayıda istek atmaz. Sonuçlar 5 dakika modül düzeyinde
cache'lenir, sekme geçişlerinde yeniden çekilmez.

**Boş durum:** `selectedTopics.length === 0` ise "İlgi alanı seç" butonu
gösterilir ve Ayarlar'a yönlendirir.

---

### 5.3 Gündem — Haber Ekranı (NewsScreen)

**Amaç:** Türk haber RSS akışı + gömülü ve kullanıcının eklediği kaynaklar.

**Bölümler (Yukarıdan Aşağıya):**

| Sıra | Bölüm | Kaynak | İçerik |
|------|-------|--------|--------|
| 1 | **Başlık + Menü** | - | "Gündem" başlığı, hamburger menü (☰) |
| 2 | **Arama çubuğu** | - | **Haber içinde** arar (`mode: 'news'`) |
| 3 | **İlgi alanı çipleri** | Onboarding | `selectedTopics` — akademik aramaya gider |
| 4 | **Kaynak filtresi** | Gömülü + özel | Haber akışını kaynağa göre filtreler |
| 5 | **Haber kartları** | N RSS | Kaynak renk şeridi + başlık + özet + indir butonu |

**Veri Yükleme:**
```typescript
useEffect(() => {
    // Gömülü 4 kaynak + kullanıcının ekledikleri; paralel, allSettled
    fetchAllNews(undefined, { sources: allSources }) → setArticles
}, [])
```

**Arama Mekanizması:**
1. Kullanıcı arama çubuğuna yazar → `query` state güncellenir
2. Enter/Submit → `onSearch(query, 'news')` → `ResultsScreen`'e geçiş
3. İlgi alanı çipine tıklanırsa → `onSearch(topic, 'academic')`
   (ilgi alanları **makale** aramasının kısayolu, haber aramasının değil)

---

### 5.4 ResultsScreen — Arama Sonuçları

**Amaç:** Aramanın sonuçlarını tek bir türde gösterme.
`mode` prop'u ile iki ayrı davranış:

| `mode` | Kaynaklar | Sayfalama |
|---|---|---|
| `'academic'` | arXiv, Semantic Scholar, OpenAlex + Evrim Ağacı | ✅ "Daha Fazla Göster" |
| `'news'` | Gömülü + özel haber RSS'leri | ❌ (RSS tek sayfa döndürür) |

**Akademik Mod:**
```
query ──┬── searchArticles(query, sources, page) → Akademik makaleler
        └── searchEvrimAgaci(query)              → Evrim Ağacı makaleleri
```

**Haber Modu:**
```
fetchAllNews(undefined, { sources: allSources }) + filterNews(all, query)
```

Eskiden tek arama çubuğu haber + Evrim Ağacı + akademik sonuçlarını aynı
listeye karıştırıyordu; bu davranış kaldırıldı.

**Sayfalama (Pagination):**
- Akademik makaleler için `page` state'i tutulur
- "Daha Fazla Göster" butonu → `loadMore()` → `searchArticles(query, sources, nextPage)`
- Yeni sonuçlar mevcut listeye eklenir (`[...prev, ...data]`)
- **Not:** Backend `perPage` değerini tutarlı vermiyor (tek kaynakta 5,
  üç kaynakta 15), bu yüzden sabit "X makale göster" varsayımı yok.

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
| Kategoriler (sekme aç/kapa) | `CategoryId[]` (`hiddenTabs`) | `[]` | Keşfet sabit; Bilim / Teknoloji / Gündem kapatılabilir |

**Ek olarak iki bölüm:**

- **Kategoriler:** alt barda hangi sekmeler görüneceğini seçer.
  Keşfet (uygulamanın açılış ekranı) kapatılamaz ve son görünür sekme
  de kapatılamaz — kullanıcı boş bir alt barda kalmaz.
- **Kendi Siteni Ekle:** kullanıcının kendi RSS/Atom adresini eklediği
  bölüm. Eklensen siteler Gündem akışına karışır ve filtre şubuğunda
  çip olarak görünür (bkz. 7.4).

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

**İlerleyici (progressive) yükleme:**
Firebase'de toplu endpoint yok — her öğe ayrı istek. Ölçülen gecikme:

| İşlem | Süre |
|---|---|
| `fetchStoryIds('top')` | ~0.57 sn |
| `fetchItems(15)` | ~0.20 sn |
| `fetchItems(30)` | ~1.0 sn |

Eskiden 30 öğenin **tamamı** bekleniyordu, ekran ~1,5 sn boş kalıyordu.
Artık ilk parti **15** öğe ile boyanıyor, kalanı arka planda 10'arlı
partiler hâlinde ekleniyor (`fetchItemsProgressive`).

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

### 7.4 Haber kaynakları: Atom, User-Agent ve özel kaynaklar

**Atom desteği:** NTV Atom formatında (`<feed><entry>`) yayın yapıyor ve
önceki RSS adresi `308` redirect veriyordu → `news.ts:parseNewsRSS`
artık `<item>` **ve** `<entry>` bloklarını ayırt ederek işliyor.
Gerekçe: standart RSS kütüphanelerinin yarısı Atom'u kesip atıyor.

**User-Agent zorunluluğu:** Sözcü `403` döndürüyor, ara katman Proxy
istemciyi engelliyor. `fetchNewsFromSource` `FETCH_HEADERS` ile
`User-Agent: Mozilla/5.0 (Linux; Android 10; K)` gönderiyor.

**Kullanıcının kendi kaynağı (özel RSS):**
- `NewsSourceId` tipi `'bbc' | 'ntv' | ... | (string & {})` olarak
  gevşetildi — mevcut dört literal tamamlama için korunur, aynı zamanda
  rastgele sonradan üretilmiş id'ler kabul edilir.
- `CustomSourcesContext.tsx` kullanıcının eklediği adresleri
  AsyncStorage'da tutar; `NewsSource` nesnesine dönüştürülür.
- **Doğrulama şartı:** `validateRssUrl` URL'yi normalize eder
  (`http:` → `https:`, boşluk atma), ardından **içeriğe** bakar:
  `<item` veya `<entry` etiketi yoksa reddeder. `res.ok` tek başına
  yeterli değil — geçersiz adreslerde 32 KB HTML gövdeli `200/404`
  döndüğü görüldü.
- **`getNewsSourceMeta` sessiz BBC fallback'ı kaldırıldı:** artık
  bilinmeyen id için `undefined` dönüyor, çağıran `FALLBACK_SOURCE_META`
  ile nötr bir rozet gösteriyor. Aksi hâlde eklenen her özel kaynak
  "BBC Türkçe" gibi görünüyor.

---

## 8. Navigasyon Mantığı

### Custom State-Based Navigation

React Navigation kullanılmıyor. Navigasyon tamamen `screen` state'i ile yönetiliyor:

```typescript
type Screen = 'discover' | 'results' | 'detail' | 'settings' | 'saved' |
              'profile' | 'hn' | 'hnReader' | 'webview' | 'evrimagaci' |
              'news' | 'offlineReader'

// Sekmeler tek kaynak: TAB_SCREENS + HOME_SCREEN
type TabId = 'discover' | 'evrimagaci' | 'hn' | 'news'
const TAB_SCREENS: TabId[] = ['discover', 'evrimagaci', 'hn', 'news']
const HOME_SCREEN: Screen = 'discover'   // açılış: Keşfet (Makaleler)

const [screen, setScreen] = useState<Screen>(HOME_SCREEN)
```

### Geri Butonu Mantığı

```typescript
const handleBack = () => {
    if (screen === 'webview')       → prevScreen (dinamik)
    if (screen === 'detail')        → detailOrigin (kayıtlılardan açıldıysa 'saved')
    if (screen === 'settings' ||
        screen === 'saved' ||
        screen === 'profile')       → menuOrigin (menünün açıldığı sekme)
    if (screen === 'hnReader')      → 'hn'
    if (screen === 'results')       → searchOrigin (arama yapılan sekme)
    else                            → HOME_SCREEN
}
```

Menü açıkken geri tuşu önce menüyü kapatır, ekran değiştirmez.

### Android Hardware Back Button

```typescript
useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', () => {
        if (menuOpen) { setMenuOpen(false); return true }   // önce menüyü kapat
        if (screen === HOME_SCREEN) return false            // uygulamadan çıkış
        handleBack()
        return true
    })
}, [screen, menuOpen])
```

### Tab Bar

Dört sekme vardır ve tab bar yalnızca bu ekranlarda gösterilir:

```typescript
type TabId = 'discover' | 'evrimagaci' | 'hn' | 'news'
const showTab = TAB_SCREENS.includes(screen)
```

**Kayıtlılar, Ayarlar ve Profil sekme değildir** — hamburger menüden (☰)
açılır. Menü her sekme ekranının sağ üst köşesindedir.

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
