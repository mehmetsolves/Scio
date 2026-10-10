# Scio — Mobil Uygulama Tasarım Briefi

> Bu doküman herhangi bir AI tasarım aracına (Galileo AI, Uizard, Figma AI, Midjourney, DALL-E, Vizcom, Musho, v0, Relume, veya benzeri) prompt olarak verilebilecek şekilde hazırlanmıştır. Her ekran bağımsız bir prompt olarak kopyalanıp yapıştırılabilir.
>
> **Not:** Bu brief bir *hedef* tarif eder, kodun kendisini değil. Koddan
> bilinçli olarak ayrıldığı yerler: (1) kartlar `borderWidth: 1` kullanıyor,
> shadow yok — flat/dergi estetiğiyle daha tutarlı bulundu; (2) tab bar 4 sekme
> (Gündem, HN, Bilim, Kayıtlı), 6 değil — Ayarlar ve Profil, Gündem başlığındaki
> ikon butonlardan açılıyor; (3) bento grid'li ayrı bir "Keşfet" ana sayfası
> yok, uygulama doğrudan Gündem ile açılıyor. Bu üç madde için brief değil,
> `ARCHITECTURE.md` ve kod esastır.

---

## Uygulama Hakkında (Bağlam)

Scio, akademik makaleleri, bilim haberlerini ve teknoloji içeriklerini Türkçe'ye çevirerek sunan bir mobil okuma uygulamasıdır. Hedef kitle: Türkçe konuşan öğrenciler, araştırmacılar ve bilim meraklıları. Platform: iOS ve Android (React Native).

---

## Tasarım Dili — Genel Kurallar

Aşağıdaki kurallar tüm ekranlar için geçerlidir. Her ekran promptunun başına bu bölümü eklemeye gerek yok ama tasarım aracına ilk seferde bu bağlamı vermek tutarlılık sağlar.

**Stil:** Modern, minimal ama sıcak. Soğuk kurumsal değil, kişisel bilgi akışı hissi. Apple Music'in keşif sayfası ile Notion'ın temizliği arasında bir denge. Bento grid layout, glassmorphism, bold tipografi, organik yuvarlatılmış köşeler.

**Renk Paleti (Light Mode):**
- Sayfa arka planı: sıcak krem beyazı #FAF7F2
- Kart arka planı: saf beyaz #FFFFFF
- Ana marka rengi: koyu bordo #7C1D2E (butonlar, vurgular, aktif elemanlar)
- İkincil aksan: lacivert #1B2B4B
- Ana metin: koyu siyah #1A1A1A
- İkincil metin: sıcak gri #6B6560
- Soluk metin / placeholder: #A09890
- Kart çerçeve ve ayırıcılar: #E4DED6
- Pressed/hover kart arka planı: #F5F0EA

**Renk Paleti (Dark Mode):**
- Sayfa arka planı: derin siyah #121212
- Kart arka planı: sıcak koyu #1E1C1A
- Marka rengi: yumuşak pembe-bordo #D4637A
- Ana metin: açık krem #E8E4DF
- İkincil metin: gri #9E9A95
- Çerçeveler: #2A2725

**İçerik Kaynakları ve Renk Kodları:**
Her içerik kaynağının kendine ait bir renk kimliği var. Badge etiketlerinde ve vurgu çizgilerinde kullanılıyor:
- arXiv: bordo #7C1D2E, açık pembe arka plan #F5E8EB
- Semantic Scholar: lacivert #1B2B4B, açık mavi #E8EDF5
- OpenAlex: koyu yeşil #2D5016, açık yeşil #EBF2E8
- Evrim Ağacı: canlı yeşil #2D8C3E, mint #E8F5E9
- Hacker News: turuncu #E65100, açık turuncu #FFF3E0
- BBC Türkçe: kırmızı #BB1919, açık kırmızı #FDE8E8
- NTV: lacivert #1A237E, açık indigo #E8EAF6
- Sözcü: turuncu-kırmızı #D84315, açık turuncu #FBE9E7
- Hürriyet: mavi #0D47A1, açık mavi #E3F2FD

**Tipografi:**
- Başlıklar ve makale isimleri: Serif font (Source Serif 4 veya benzer editorial serif). Kalın, büyük, cesur.
- UI elemanları, butonlar, metadata: Sans-serif font (Inter veya benzer geometric sans). Temiz, okunabilir.
- Abstract/alıntı metinleri: Serif italic. Yumuşak, kitap hissi.

**Kart Stili:**
- Border yok, bunun yerine çok hafif shadow (0 2px 8px rgba(0,0,0,0.04))
- Köşe yuvarlatma: 16px
- İç padding: 16-20px
- Dark mode'da shadow yerine ince border (#2A2725)

**Tab Bar:**
- 6 sekme: Keşfet, Gündem, HN, Bilim, Kayıtlı, Ayarlar
- Glassmorphism efekti: yarı saydam arka plan + blur
- Aktif sekmenin üstünde küçük yuvarlak nokta veya ince çizgi göstergesi

**Genel Animasyon İpuçları:**
- Kart basma: hafif küçülme (scale 0.97) + arka plan renk değişimi
- Loading: skeleton shimmer (gri kutuların üzerinde kayan parlama)
- Canlı gösterge: nabız atan küçük kırmızı nokta (pulse animasyon)

---

## Ekran Promptları

Aşağıdaki her bölüm, tek bir ekran için bağımsız bir prompttur. İstediğin AI tasarım aracına kopyala-yapıştır yapabilirsin. Promptların başına genel kuralları da eklersen daha tutarlı sonuç alırsın.

---

### PROMPT 1 — Onboarding Ekranı

Bir mobil uygulama onboarding ekranı tasarla. iPhone boyutunda (390x844px), dikey.

Arka plan: üst kısımda koyu bordo (#7C1D2E) ile sıcak krem (#FAF7F2) arasında yumuşak gradient geçiş. Gradient neredeyse fark edilmeyecek kadar ince.

Üst üçte birde büyük, kalın serif başlık: "Bilgiyi keşfet." Beyaz renkte. Altında bir satır açıklama: "İlgi alanlarını seç, sana özel içerikler hazırlayalım." — yarı saydam beyaz, sans-serif, 15pt.

Orta bölümde farklı boyutlarda konu chip'leri var. Organik şekilde dağılmış, grid değil akışkan bir düzen. Chip'ler: "Yapay Zeka", "Fizik", "Biyoloji", "Nörobilim", "İklim", "Uzay", "Matematik", "Psikoloji", "Tıp", "Kimya", "Tarih", "Felsefe". Seçilmemiş chip'ler: saydam arka plan, ince beyaz border. Seçilmiş chip'ler: bordo (#7C1D2E) dolu arka plan, beyaz text. 3-4 tanesi seçili göster.

En altta tam genişlikte yuvarlak köşeli buton: "Başlayalım". Bordo arka plan, beyaz text, 16pt semibold. Üstünde küçük soluk not: "İstediğin zaman değiştirebilirsin."

Arka planda, başlığın arkasında çok soluk (opaklık %3-5) büyük bir "W" harfi — marka watermark.

Stil: modern, sıcak, davetkar. Glassmorphism detayları. Hiçbir şekilde kurumsal veya soğuk görünmemeli.

---

### PROMPT 2 — Ana Sayfa (Home / Keşfet)

Bir mobil uygulama ana sayfası tasarla. iPhone boyutunda (390x844px), dikey, scroll edilebilir.

Arka plan: sıcak krem #FAF7F2.

**Üst alan (scroll ile birlikte kaybolabilir):**
- Sol üstte "Scio" marka yazısı — serif italic, küçük (13pt), bordo (#7C1D2E), uppercase, letter-spacing geniş.
- Sağ üstte küçük daire profil ikonu (32px, gri placeholder).
- Altında tam genişlikte arama çubuğu: beyaz arka plan, 1.5px sıcak gri border (#C8BFB5), köşe yuvarlatma 14px. Sol tarafta büyüteç ikonu, placeholder: "Ne okumak istersin?" — soluk gri. Etrafında çok hafif shadow.
- Arama çubuğunun altında yatay kayan küçük pill butonlar: "transformers", "iklim değişikliği", "kuantum hesaplama", "nöroplastisite", "dil modeli". Şeffaf arka plan, ince border, yuvarlak köşeler (20px).

**İçerik alanı — Bento grid layout:**

Birinci satır (tam genişlik): "Son Dakika" kartı. Beyaz kart, hafif shadow, köşe yuvarlatma 16px. Sol kenarında 3px kalınlığında dikey kırmızı çizgi. İçinde:
- Üstte küçük kırmızı pulse eden nokta + "SON DAKİKA — GÜNDEM" etiketi (kırmızı, uppercase, 11pt, semibold)
- 3 haber başlığı alt alta. Her birinin solunda küçük renkli kaynak badge'i (BBC kırmızı, NTV lacivert vs.), sağında "2 saat önce" gibi zaman bilgisi.

İkinci satır (iki yarım kart yan yana, 10px gap):
- Sol kart: Hacker News. Kartın üst kenarında 4px yüksekliğinde turuncu (#E65100) şerit. İçinde "▲ Hacker News" başlığı ve 2 story başlığı, kompakt. Her başlık altında küçük domain bilgisi.
- Sağ kart: Evrim Ağacı. Kartın üst kenarında 4px yeşil (#2D8C3E) şerit. İçinde "🌿 Bilim" başlığı ve 2 makale başlığı.

Üçüncü bölüm (tam genişlik): "SENİN İÇİN" bölüm başlığı (soluk gri, uppercase, 11pt). Altında yatay kaydırılabilir (horizontal scroll) makale kartları. Her kart dikey, ekran genişliğinin %70'i kadar. Kartın üstünde kaynak badge'i, ortasında başlık (serif semibold, 15pt), altında yazar isimleri ve yıl. Snap-to-card efekti.

**En altta:** glassmorphism tab bar — yarı saydam, blur efektli. 6 sekme: Keşfet (aktif, bordo), Gündem, HN, Bilim, Kayıtlı, Ayarlar. Aktif sekmenin üstünde küçük bordo nokta göstergesi.

Genel his: canlı, kişiselleştirilmiş haber akışı. Pinterest veya Apple News tarzı ama akademik içerikle.

---

### PROMPT 3 — Arama Sonuçları

Bir mobil arama sonuçları ekranı tasarla. iPhone boyutunda, dikey, scroll edilebilir.

Arka plan: krem #FAF7F2. Tab bar gizli.

**Üst navigation bar:**
- Solda geri oku (← veya chevron, bordo)
- Ortada düzenlenebilir arama alanı: beyaz arka planlı kart şeklinde, ince border, içinde "yapay zeka" yazıyor (arama terimi). Köşe yuvarlatma 8px.
- Navbar altında küçük soluk metin: "24 sonuç bulundu"

**İçerik alanı — Gruplu sonuçlar:**

Birinci grup: "📰 HABER SONUÇLARI" başlığı (kırmızı #C62828, uppercase, 11pt). Altında 2 haber kartı. Her kartta: sol üstte renkli kaynak badge (BBC, NTV vs.), başlık (15pt, kalın), açıklama (2 satır, 13pt, gri), sağ üstte tarih.

İkinci grup: "🌿 EVRİM AĞACI" başlığı (yeşil #2D8C3E). 1-2 makale kartı. Yeşil arka planlı "Evrim Ağacı" badge'i, başlık, kategori + tarih.

Üçüncü grup: "AKADEMİK MAKALELER" başlığı (soluk gri). Akademik makale kartları — her biri:
- Üstte kaynak badge (arXiv/Semantic Scholar/OpenAlex, kendi renginde)
- Başlık: serif semibold, 16pt
- Yazar isimleri · Yıl (12pt, gri)
- Abstract ilk 2 satırı (13pt, soluk)
- Kartlar arası 10px gap, hafif shadow

En altta: "Daha Fazla Göster" outlined buton — bordo border, bordo text, yuvarlak köşeli.

Boş durum alternatifi: ekran ortasında büyük 📭 emoji, "Sonuç bulunamadı" başlığı, "Farklı anahtar kelimeler deneyin" alt metni.

---

### PROMPT 4 — Makale Detayı

Bir mobil makale okuma ekranı tasarla. iPhone boyutunda, dikey, scroll edilebilir. Temiz okuma deneyimi, distraction-free.

Arka plan: krem #FAF7F2. Tab bar gizli.

**Üst navigation bar:**
- Solda geri oku (bordo)
- Yanında küçük kaynak badge'i (örn: "arXiv" — bordo arka plan)
- Sağ tarafta iki ikon butonu: kalp ikonu (ince çizgi, outline — kaydet) ve aşağı ok ikonu (indir). İkisi de bordo. Kaydedilmişse kalp dolu.

**İçerik alanı (dar sütun, max 600px, ortalanmış):**

Çeviri yükleniyor durumu: başlık ve abstract alanında skeleton shimmer efekti — krem renkte (#E4DED6 ile #F5F0EA arası parlayan kutular).

Çeviri tamamlandığında:
- Başlık: büyük serif bold, 22pt, satır yüksekliği 30pt. Çevrilmiş Türkçe metin.
- Yazarlar: sans-serif, 13pt, gri. Virgülle ayrılmış.
- Yıl: 12pt, soluk gri.
- İnce ayırıcı çizgi (1px, #C8BFB5).
- Abstract kutusu: krem arka plan (#F5F0EA), sol kenarında 3px bordo dikey çizgi (blockquote tarzı). İçinde:
  - "ÖZET" etiketi (bordo, uppercase, 11pt, semibold)
  - Abstract metni (serif italic, 14pt, satır yüksekliği 24pt)
- Özetle butonu: bordo dolu buton, beyaz text "📝 Özetle", yuvarlak köşeli.
- Özet sonucu (butonun altında açılan kart): krem arka plan, ince border, içinde "Sadeleştirilmiş Özet" başlığı + collapse/expand ok ikonu + özet metni.
- En altta bordo altı çizili link: "Orijinal makaleyi görüntüle →"

**Sağ alt köşede yüzen buton (FAB):**
Koyu siyah (#1A1A1A) arka plan, yuvarlak köşeli (22px), hafif shadow. İçinde Türk bayrağı emojisi + "Türkçe" yazısı (veya İngiliz bayrağı + "English"). Dil değiştirme butonu.

Genel his: Medium.com veya Substack okuma deneyimi gibi temiz ve odaklanmış.

---

### PROMPT 5 — Hacker News Ekranı

Bir mobil haber listesi ekranı tasarla. iPhone boyutunda, dikey, scroll edilebilir.

Arka plan: krem #FAF7F2. Üst kısımda ince turuncu (#E65100) gradient başlık alanı (60px yükseklik). İçinde beyaz "▲ Hacker News" başlığı.

Başlığın altında üç segmentli tab bar: "Top", "New", "Best". Aktif segment: bordo (#7C1D2E) dolu arka plan, beyaz text. Diğerleri: şeffaf, bordo border.

Altında küçük tarih filtresi pill'leri (yatay scroll): "Tümü", "Bugün", "Bu Hafta", "Bu Ay". Aktif olan bordo tint arka plan.

Story listesi: her story bir satır. Solda turuncu ▲ ikonu + skor sayısı (dikey, küçük). Ortada başlık (serif semibold, 14pt, max 2 satır). Altında metadata: "github.com · 3s önce · 42 yorum" — sans-serif 11pt, gri. Story'ler arası ince ayırıcı çizgi (hairline).

Altta: glassmorphism tab bar. HN sekmesi aktif (turuncu renkte).

---

### PROMPT 6 — Evrim Ağacı (Bilim) Ekranı

Bir mobil bilim makaleleri listesi ekranı tasarla. iPhone boyutunda, dikey.

Arka plan: krem #FAF7F2. Üst kısımda ince yeşil (#2D8C3E) gradient başlık alanı. İçinde "🌿 Evrim Ağacı" başlığı.

Altında yatay scroll eden kategori chip'leri: "Tümü", "Biyoloji", "Fizik", "Teknoloji", "Evrim", "Sağlık". Aktif olan yeşil dolu.

Makale kartları dikey liste. Her kart:
- Beyaz arka plan, hafif shadow, 16px köşe yuvarlatma
- Başlık (serif semibold, 15pt)
- Açıklama (sans, 13pt, gri, 2 satır)
- Kategori etiketi + tarih ("Biyoloji · 3 gün önce")
- Sağ tarafta opsiyonel küçük kare thumbnail (60x60px, yuvarlatılmış köşe)

Altta: glassmorphism tab bar. Bilim sekmesi aktif (yeşil renkte).

---

### PROMPT 7 — Gündem / Haberler Ekranı

Bir mobil haber akışı ekranı tasarla. iPhone boyutunda, dikey.

Arka plan: krem #FAF7F2. Üst kısımda kırmızı temalı başlık alanı. "📰 Gündem" başlığı. Yanında küçük pulse eden canlı kırmızı nokta.

Altında kaynak filtre chip'leri: "Tümü", "BBC Türkçe" (kırmızı), "NTV" (lacivert), "Sözcü" (turuncu), "Hürriyet" (mavi). Her chip kendi kaynak renginde. Aktif olan dolu, diğerleri outlined.

Haber kartları:
- Beyaz arka plan, hafif shadow, 16px köşe yuvarlatma
- Sol üstte renkli kaynak badge (kaynağın kendi renginde etiket)
- Başlık (15pt, kalın)
- Açıklama (13pt, 2 satır, gri)
- Sağ üstte relative tarih ("2 saat önce")
- Kartlar arası 10px gap

Altta: glassmorphism tab bar. Gündem sekmesi aktif (kırmızı renkte).

---

### PROMPT 8 — Kaydedilenler Ekranı

Bir mobil kayıtlı içerikler ekranı tasarla. iPhone boyutunda, dikey.

Arka plan: krem #FAF7F2.

Üstte başlık: "Kayıtlılar" (serif bold, 22pt).

Hemen altında yatay sekme seçici: "Makaleler", "HN", "Evrim Ağacı", "İndirilenler". Aktif olanın altında 2px bordo underline göstergesi. Sekmeler yatay scroll edebilir.

Altında durum filtresi pill'leri: "Tümü", "Okunmadı", "Beğendim ♥", "Beğenmedim". Aktif olan bordo tint arka plan.

Kayıtlı makale kartları: detay ekranına benzer ama daha kompakt. Her kartta:
- Kaynak badge
- Başlık (15pt)
- Yazar · Yıl
- Sağ tarafta üç nokta menü ikonu (⋯)

İndirilenler sekmesinde her kartta "✓ Çevrimdışı" küçük yeşil etiketi.

Boş durum: büyük ♡ outline ikonu (bordo), "Henüz kayıtlı makalen yok" başlığı, "Keşfet sekmesinden makaleleri kaydedebilirsin" alt metni.

Altta: glassmorphism tab bar. Kayıtlı sekmesi aktif (bordo renkte).

---

### PROMPT 9 — Ayarlar Ekranı

Bir mobil uygulama ayarlar ekranı tasarla. iPhone boyutunda, dikey.

Arka plan: krem #FAF7F2.

Üstte başlık: "Ayarlar" (serif bold, 22pt).

Bölümlenmiş liste yapısı. Her bölümün üstünde gri uppercase başlık (11pt, letter-spacing geniş).

Bölüm "AKADEMİK KAYNAKLAR": Üç satır, her birinde kaynak adı + toggle switch. Toggle açıkken bordo, kapalıyken gri. Kaynaklar: arXiv, Semantic Scholar, OpenAlex.

Bölüm "GÖRÜNÜM": "Karanlık Mod" satırı + toggle switch.

Bölüm "ÇEVİRİ": 
- "Motor" satırı — sağda mevcut seçim ("MyMemory") ve chevron ikonu
- "Stil" satırı — iki segmentli seçici: "Akademik" | "Basit". Aktif olan bordo dolu.

Bölüm "API ANAHTARI": Password input alanı, ince border. Altında küçük bilgi notu: "Anthropic veya OpenAI için gerekli."

Bölüm "İLGİ ALANLARI": Seçili konu chip'leri (her birinde × kaldırma butonu). Altında "+ Konu Ekle" text butonu (bordo).

Altta: glassmorphism tab bar. Ayarlar sekmesi aktif.

Her satır arasında ince ayırıcı çizgi. Satırlar 48px yüksekliğinde, dokunma alanı rahat.

---

### PROMPT 10 — Çevrimdışı Okuyucu

Bir mobil makale okuma ekranı tasarla. iPhone boyutunda, dikey, tam ekran okuma modu.

Arka plan: krem #FAF7F2. Tab bar gizli.

Üstte minimal navigation bar: geri oku + başlık (tek satır, truncated). Sağda dil değiştirme segmenti: "Orijinal" | "Çeviri" — iki butonlu segment. Aktif olan bordo dolu.

İçerik alanı:
- Başlık: serif bold, 20pt
- Geniş padding (her iki yandan 24px)
- Body text: sans-serif, 15pt, satır yüksekliği 26pt
- Paragraflar arası 16px boşluk
- Temiz, kitap gibi okuma deneyimi

Distraction-free, minimal, odaklanmış.

---

### PROMPT 11 — WebView Okuyucu

Bir mobil tarayıcı-içi okuma ekranı tasarla. iPhone boyutunda, dikey.

Üstte ince navigation bar: geri oku + sayfa başlığı (truncated, 1 satır, sans medium 13pt). Tab bar gizli.

Navbar altında ince bordo linear progress bar (sayfa yüklenirken kayan).

Geri kalan alan: tam ekran web sayfası içeriği (placeholder olarak bir makale sayfası göster).

Minimal shell, içerik odaklı.

---

### PROMPT 12 — Loading / Hata / Boş Durumlar

Üç farklı durumu gösteren bir mobil ekran seti tasarla. iPhone boyutunda.

**Loading durumu:** Ekranın ortasında kart şeklinde skeleton shimmer. 3-4 kart placeholder'ı alt alta. Her kart: üstte küçük dikdörtgen (badge yeri), ortada 2 uzun dikdörtgen (başlık yeri), altta kısa dikdörtgen (metadata yeri). Renk: #E4DED6 ile #F5F0EA arası kayan parlama animasyonu.

**Hata durumu:** Ekranın ortasında büyük ⚠️ emoji (32pt), altında "Bir hata oluştu" başlığı (semibold, 16pt), "İnternet bağlantını kontrol et" alt metni (13pt, gri), bordo dolu "Tekrar Dene" butonu.

**Boş durum:** Ekranın ortasında büyük 📭 emoji (32pt), altında "Sonuç bulunamadı" başlığı, "Farklı anahtar kelimeler deneyin" alt metni. Minimal, sevimli.

---

## Tab Bar Detaylı Prompt

Bir mobil uygulama alt navigasyon çubuğu (tab bar) tasarla. iPhone boyutunda, yalnızca alt kısım.

6 sekme, eşit genişlikte:
1. Keşfet — ızgara ikonu (⊞)
2. Gündem — gazete ikonu (📰)
3. HN — yukarı ok üçgeni (▲)
4. Bilim — yaprak ikonu (🌿)
5. Kayıtlı — kalp ikonu (♡)
6. Ayarlar — dişli ikonu (⚙)

Her sekme: üstte ikon (18pt), altında etiket (10pt).

Arka plan: yarı saydam beyaz (glassmorphism efekti, arka plan blur). Üst kenardan aşağı doğru çok ince shadow gradient (yüzme hissi).

Aktif sekme: ikon ve etiket kendi temalı renginde (Keşfet=bordo, Gündem=kırmızı, HN=turuncu, Bilim=yeşil, Kayıtlı=bordo, Ayarlar=bordo). Aktif sekmenin tam üstünde küçük yuvarlak nokta göstergesi (aktif renkte).

Pasif sekmeler: soluk gri (#A09890) ikon ve etiket.

---

## Dark Mode Tam Ekran Promptu

Yukarıdaki ekranlardan herhangi birini dark mode olarak tasarlamak için ekstra talimatlar:

- Sayfa arka planı: #121212
- Kart arka planı: #1E1C1A
- Kartlarda shadow yerine ince border (#2A2725)
- Ana metin: #E8E4DF
- İkincil metin: #9E9A95
- Marka bordo: #D4637A (daha açık ve parlak)
- Tab bar: koyu yarı saydam (rgba(18,18,18,0.85)) + blur
- Kaynak badge arka planları daha koyu tonlara geçer (örn: arXiv badge: #2D1F22)
- Genel his: OLED dostu, göz yormayan, sıcak koyu tonlar

Prompt örneği: "Yukardaki [Ekran Adı] promptunu dark mode olarak tasarla. Arka plan #121212, kartlar #1E1C1A, metin #E8E4DF, marka rengi #D4637A. Shadow yerine ince border kullan."

---

## Ekstra: Tam Uygulama Akışı Promptu

Tüm ekranları tek seferde oluşturmak isteyen araçlar için (Galileo AI, Uizard gibi):

> "Scio adında bir mobil okuma uygulaması tasarla. Akademik makaleleri ve haberleri Türkçe'ye çeviren bir uygulama. 12 ekrandan oluşuyor: Onboarding (konu seçimi), Ana Sayfa (bento grid: haberler + HN + bilim + öneriler), Arama Sonuçları (gruplu liste), Makale Detayı (çevirilmiş abstract, özetleme, dil değiştirme FAB), Hacker News listesi, Evrim Ağacı bilim makaleleri, Gündem haberleri, Kaydedilenler, Ayarlar, Çevrimdışı Okuyucu, WebView, Loading/Hata durumları. Renk paleti: sıcak krem arka plan (#FAF7F2), bordo marka rengi (#7C1D2E), serif başlıklar, sans-serif UI. Modern tasarım: glassmorphism tab bar, bento grid layout, skeleton loading, bold tipografi, yuvarlatılmış köşeler (16px), hafif shadow kartlar. Hem light hem dark mode."

---

## Kullanım İpuçları

| AI Aracı | Nasıl Kullan |
|----------|-------------|
| **Galileo AI** | Tek tek ekran promptlarını yapıştır, "Mobile app screen" seç |
| **Uizard** | "Tam Uygulama Akışı" promptunu ver, otomatik çoklu ekran üretir |
| **Midjourney** | Her prompt başına "UI design, mobile app screenshot, iPhone mockup, Dribbble style --ar 9:16" ekle |
| **DALL-E / GPT-4o** | Promptu doğrudan ver, "high fidelity mobile UI mockup" belirt |
| **Figma AI** | Bölüm bölüm yapıştır, frame boyutunu 390x844 ayarla |
| **v0 (Vercel)** | Promptu yapıştır, React Native yerine web bileşen olarak üretir, sonra adapte edersin |
| **Musho** | Landing page değil "mobile app" belirt, ekran ekran ver |
| **Relume** | Wireframe aşamasında kullan, sonra Figma'ya aktar |

Her araçta sonuç aldıktan sonra iterasyon yap: "Kartları daha yuvarlatılmış yap", "Başlığı daha büyük yap", "Shadow'u azalt" gibi follow-up promptlarla ince ayar çek.
