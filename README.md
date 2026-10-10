# Scio

Dağınık kaynaklardan içerik toplayıp Türkçeye çevirerek tek akışta sunan bir
mobil okuma uygulaması. Dört kaynak türünü birleştirir:

- **Akademik makaleler** — arXiv, Semantic Scholar, OpenAlex (backend üzerinden arama)
- **Hacker News** — resmi Firebase API (doğrudan cihazdan)
- **Evrim Ağacı** — RSS (doğrudan cihazdan)
- **Türk haberleri** — BBC Türkçe, NTV, Sözcü, Hürriyet RSS (doğrudan cihazdan)

Topladığı metni Türkçeye çevirir, isteğe bağlı AI özetleme yapar ve makaleyi
çevirisiyle birlikte indirip çevrimdışı okumaya izin verir.

> **Not:** Uygulama eskiden "WordReads" adıyla geliştiriliyordu. Scio'ya geçişte
> depolama anahtarları `@wordreads_*` → `@scio_*` olarak değişti; mevcut
> kullanıcıların verisi tek seferlik taşıma ile korunuyor (bkz. `src/store/`).

## Kurulum

```bash
npm install
npx expo install --fix   # RN/Expo sürüm uyumunu otomatik düzeltir
npx expo start
```

Telefonda **Expo Go** ile QR kodu okutarak canlı önizleme yapabilirsin — en
hızlı test yolu.

## Gerçek APK üretmek (EAS Build)

```bash
npm install -g eas-cli
eas login                          # ücretsiz Expo hesabı gerekir
eas build -p android --profile preview
```

`eas.json` içindeki `preview` profili `buildType: apk` (doğrudan kurulabilir),
`production` profili ise Play Store için `app-bundle`. EAS proje kimliği
`app.json` içinde tanımlı.

## Mimari özeti

- **Expo SDK 54 · React Native 0.81 · React 19 · TypeScript (strict)**
- **Navigasyon:** React Navigation yok — `App.tsx` içinde `useState<Screen>` ile
  elle yönetiliyor, Android geri tuşu `BackHandler`'a bağlı.
- **State:** üç Context — `SettingsContext`, `SavedArticlesContext`,
  `DownloadsContext`.
- **Depolama:** AsyncStorage; API anahtarı `expo-secure-store` içinde şifreli.
- **Backend:** Cloudflare Worker (`/api/search`, `/api/translate`,
  `/api/summarize`, `/api/extract`). Worker'ın kaynak kodu bu repoda değil.

Ayrıntılı mimari, ekran ekran akış ve veri modeli için [ARCHITECTURE.md](ARCHITECTURE.md).

## Bilinen sınırlar

- Uzun listeler `ScrollView` + `map` ile render ediliyor; `FlatList`'e geçiş
  henüz yapılmadı. Mevcut öğe sayılarında (HN'de 30, feed'lerde ~30) sorun
  oluşturmuyor.
- Test altyapısı yok.
- `DESIGN.md` — tasarım briefi (tasarım aracı prompt'ları). Koddaki bazı
  kararlar (border'lı kartlar, 4 sekme) briefi'ten bilinçli olarak ayrılıyor;
  ayrıntı dosyanın başında.
- `DESIGN_STITCH_REFERENCE.ts` — Google Stitch için hazırlanmış token referansı.
  **Kod tarafından import edilmiyor**; yalnızca tasarım aracına girdi olarak
  hazırlandı, çalışma zamanında kullanılmıyor.

## Play Store notu

Android paket adı `com.scio.app` (`app.json`). Play Store'a çıkacaksan bunu
kendi domain'ine göre değiştir (örn. `com.seninsirket.scio`) ve değiştirdiğin
anda depolama anahtarlarını da gözden geçir — paket adı değişince uygulama
Play Store'da yeni bir uygulama olur.
