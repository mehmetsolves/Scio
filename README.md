# WordReads — Expo (React Native) sürümü

Figma Make'ten gelen web (Vite + React) tasarımının React Native / Expo dönüşümü.
Ekranlar (Home, Results, Detail) ve görsel tasarım (renkler, fontlar, kart
yapısı) birebir korunmuştur; sadece `div/span/button` gibi web elemanları
`View/Text/Pressable` gibi RN karşılıklarına çevrildi.

## Kurulum

```bash
npm install
npx expo install --fix   # RN/Expo sürüm uyumunu otomatik düzeltir
npx expo start
```

Telefonunda **Expo Go** uygulamasını kurup QR kodu okutarak canlı önizleme
yapabilirsin (en hızlı test yolu).

## Gerçek APK üretmek (EAS Build)

Expo Go içinde önizlemek geliştirme için yeterli ama gerçek, kurulabilir bir
`.apk` dosyası için Expo'nun bulut derleme servisi **EAS Build** gerekiyor
(ücretsiz kotası var):

```bash
npm install -g eas-cli
eas login                          # ücretsiz Expo hesabı gerekir
eas build:configure                # ilk seferde proje ID'sini bağlar
eas build -p android --profile preview
```

Derleme bulutta tamamlanınca terminale bir indirme linki düşer — o link
doğrudan telefona kurulabilir `.apk` dosyasıdır. `eas.json` içindeki
`preview` profili `buildType: apk` olarak ayarlı (Play Store için gereken
`.aab` değil, doğrudan kurulabilir apk).

## Notlar / sonraki adımlar

- Şu an makaleler `App.tsx` içinde sabit (mock) veri. Gerçek arXiv /
  Semantic Scholar / OpenAlex + çeviri entegrasyonu için önceki mesajda
  konuştuğumuz backend katmanını eklemek gerekiyor.
- `@expo-google-fonts/source-serif-4` paketi fontu ağdan yükler; tamamen
  offline ilk açılış istersen fontu `assets/fonts` altına indirip
  `expo-font` ile local yükleyecek şekilde değiştirebiliriz.
- Android paket adı `app.json` içinde `com.wordreads.app` — Play Store'a
  çıkacaksan bunu kendi domain'ine göre değiştir (örn. `com.senin.wordreads`).
