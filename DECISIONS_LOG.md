# DECISIONS_LOG — Rumah Keripik Courier (Capacitor)

> Log penyimpangan & keputusan teknis selama eksekusi `COURIER_CAPACITOR_MIGRATION_BLUEPRINT.md` (Fase 0–8), `COURIER_UI_CSS_OVERHAUL.md` (Fase A–D), dan `COURIER_BLUEPRINT.md`.
> Format: **ID | Keputusan | Alasan | Trade-off | Sumber blueprint yang disimpangi**.
> Tambahkan entri di bagian atas daftar setiap kali menyimpang dari blueprint.

## 1. Ringkasan Status

| Blueprint | Fase | Status |
|---|---|---|
| COURIER_CAPACITOR_MIGRATION | F0 Bootstrap | ✅ Selesai |
| COURIER_CAPACITOR_MIGRATION | F1 Auth & Shell | ✅ Selesai |
| COURIER_CAPACITOR_MIGRATION | F2 Offline Data Layer | ✅ Selesai |
| COURIER_CAPACITOR_MIGRATION | F3 Alur Inti Pengiriman | ✅ Selesai |
| COURIER_CAPACITOR_MIGRATION | F4 Location & Peta | ✅ Selesai (kode), uji lapangan F7 menunggu |
| COURIER_CAPACITOR_MIGRATION | F5 Fitur Pendukung | ✅ Selesai |
| COURIER_CAPACITOR_MIGRATION | F6 Push & Live Update | ✅ Selesai |
| COURIER_CAPACITOR_MIGRATION | F7 Uji Paralel Lapangan | ⏳ Belum (operasional) |
| COURIER_CAPACITOR_MIGRATION | F8 Cutover | ⏳ Belum (tergantung F7) |
| COURIER_UI_CSS_OVERHAUL | Fase A Fondasi | ✅ Selesai |
| COURIER_UI_CSS_OVERHAUL | Fase B Component Library | ✅ Selesai (8/10; 2 diganti solusi native CSS) |
| COURIER_UI_CSS_OVERHAUL | Fase C Migrasi Layar | ✅ Selesai (10 layar) |
| COURIER_UI_CSS_OVERHAUL | Fase D Hapus StyleSheet lama | N/A (codebase baru, tidak ada StyleSheet RN) |

## 2. Daftar Keputusan

### D-017 - Route cache berbasis DB (TTL 24 jam) + wiring ORS Matrix
- **Keputusan:** outeCache dipindah dari AsyncStorage ke tabel oute_cache pada SQLite (drizzle) dengan TTL 24 jam dan pembersihan otomatis saat app start (pruneRouteCache); saat online + API key ORS tersedia, etchDistanceMatrix dipakai untuk menjalankan ulang 2-opt/Or-opt dengan jarak jalan asli sebagai pengganti Haversine.
- **Alasan:** blueprint §4.5 menuntut jarak jalan asli bila online; cache DB lebih tahan-besar daripada AsyncStorage dan bisa diprune.
- **Trade-off:** dua panggilan ORS (directions per-leg + matrix) saat online; bila ORS gagal tetap jatuh ke heuristik lokal + garis lurus.
- **Sumber:** COURIER_ROUTING_BLUEPRINT §4.5, §9.



### D-016 - Migrasi peta ke MapLibre GL
- **Keputusan:** Mengganti implementasi peta saat ini (Leaflet di `NativeRouteMap.tsx`) ke **MapLibre GL** (WebGL, dirender dalam WebView); komponen baru `RouteMap.tsx` full-screen + style peta terang.
- **Alasan:** Arahan langsung user untuk mengikuti blueprint map (migrasi MapLibre), menimpa rekomendasi awal mempertahankan Leaflet karena kendala hardware low-end.
- **Trade-off (dicatat, bukan batal):** device itel M666S (Android entry-level) WebGL tidak andal; risiko blank/rendah FPS. Mitigasi: guard supportsWebGL() + fallback Leaflet bila gagal. Menyimpangi D-003 (GoogleMaps plugin) dan mengganti Leaflet.
- **Sumber:** map blueprint #1.4, #5.2-5.4.

### D-015 - UI default light (Kripik Fresh)
- **Keputusan:** Default theme `light`; semua layer & komponen dimigrasi dari class legacy (umber/amber/emerald) ke semantic tokens (bg-surface, text-ink, bg-brand, dst).
- **Alasan:** UI blueprint #2 menetapkan karakter terang gaya Gojek/Grab sebagai bahasa desain utama; dark tetap via toggler SettingsSheet.
- **Trade-off:** dark mode bukan jalur utama, tetap berfungsi via CSS vars `[data-theme]`.


### D-001 — Stub `firebase/messaging` di vite config (bukan install firebase)
- **Keputusan:** Alias `firebase/messaging` ke `src/lib/firebase-messaging-stub.ts` di `vite.config.ts`.
- **Alasan:** `@capacitor-firebase/messaging` mengimpor web plugin yang butuh `firebase/messaging` (optional peer dep). App ini **Android-only** (blueprint I.1), web hanyalah dev/serve — install firebase penuh (~1MB+) hanya untuk memuaskan resolver build adalah mubazir.
- **Trade-off:** Push FCM di web/tests tidak berfungsi (memang tidak diperlukan); native tetap pakai plugin asli.
- **Sumber:** adendum Capacitor (web = dev-only). Tidak menyimpang, penyempurnaan pipeline.

### D-002 — Secure storage untuk token & PIN (bukan Capawesome Secure Preferences)
- **Keputusan:** `capacitor-secure-storage-plugin@0.12.0` menggantikan Capawesome Secure Preferences yang direkomendasikan blueprint V.1.
- **Alasan:** plugin Capawesome tidak ter-publish untuk Capacitor 7 saat migrasi berjalan; `capacitor-secure-storage-plugin` v0.12 kompatibel v7 dan API `get/set/remove({key})` setara. Dipakai untuk key SENSITIVE (access token, refresh token, pinEnabled) dengan fallback `@capacitor/preferences` untuk data non-sensitif — selaras prinsip VI.3 blueprint (token/PIN tidak di localStorage).
- **Trade-off:** migrasi plugin di masa depan perlu update `lib/storage.ts` (satu titik).
- **Sumber:** VI.3 (keamanan token), II.6 (secure token storage).

### D-003 — Peta native `@capacitor/google-maps` + handoff `google.navigation`
- **Keputusan:** `NativeRouteMap.tsx` memakai `GoogleMap.create/addMarkers/addPolylines/enableCurrentLocation/setCamera`; navigasi turn-by-turn tetap deep-link `google.navigation:q=lat,lng` via `@capacitor/app` `openUrl`.
- **Alasan:** blueprint V.3 — plugin merender native MapView (performa native) dan pola handoff ke Google Maps eksternal **dipertahankan** (keputusan cerdas eksisting).
- **Trade-off:** butuh API key Google Maps (bundle-only, di `env.ts`), peta tidak tampil di web dev tanpa plugin native.
- **Sumber:** V.3, II.1.2, III.2.

### D-004 — `CapacitorHttp` dipakai di api-client & background-location
- **Keputusan:** Semua request yang bisa terjadi saat app di-background (sync lokasi batch) memakai `CapacitorHttp`, bukan `fetch`; request UI memakai wrapper yang sama.
- **Alasan:** blueprint V.1 — Android me-throttle HTTP WebView setelah 5 menit background; native HTTP plugin tidak kena throttle.
- **Trade-off:** respons `CapacitorHttp` perlu `.data` unwrap; semua call-site lewat satu wrapper `apiRequest`.
- **Sumber:** II.6 (HTTP client), V.1.

### D-005 — Background geolocation: `addWatcher` + buffer SQLite + batch sync
- **Keputusan:** `@capacitor-community/background-geolocation@1.2.26` (`registerPlugin`), titik lokasi ditulis ke buffer lokal, dikirim batch via `CapacitorHttp`.
- **Alasan:** blueprint V.1 — JANGAN kirim langsung dari callback watcher; buffer disk lokal + sync terpisah (identik filosofi offline-queue eksisting).
- **Trade-off:** akurasi live sedikit tertunda (batch), diimbangi keandalan di background.
- **Sumber:** V.1, III.4.

### D-006 — Live update Capgo ter-wire di `main.tsx` & `auth-store.ts`
- **Keputusan:** `notifyAppReady()` sejak awal app (anti rollback otomatis), `setupLiveUpdate({courierId})` dipanggil saat bootstrap/login berhasil.
- **Alasan:** blueprint V.6 — bundle web di-update OTA tanpa reinstall APK; konfirmasi bundle sehat sejak awal adalah praktik resmi Capgo.
- **Trade-off:** butuh akun Capgo + `CAPGO_*` key di env produksi; tanpa key, app tetap jalan (no-op).
- **Sumber:** V.6.

### D-007 — Push FCM: token ke `/api/courier/push-tokens`, payload tawaran lewat flag `offer`
- **Keputusan:** `notifications.ts` memakai `@capacitor-firebase/messaging`, token dikirim ke endpoint eksisting `POST /api/courier/push-tokens` `{expoPushToken, platform}`; listener `notificationReceived` mengecek flag `offer` untuk arahkan ke layar tawaran.
- **Alasan:** kontrak API sumber kebenaran `rumah-kripik-web` (zod); backend tidak perlu berubah.
- **Trade-off:** untuk Android-only, FCM via `@capacitor-firebase/messaging` sedikit lebih berat daripada `@capacitor/push-notifications` biasa, tapi future-proof iOS.
- **Sumber:** II.6 (push notification), XV.

### D-008 — Canvas/`d.ts` untuk elemen `<capacitor-google-map>` custom element
- **Keputusan:** `src/types/capacitor-google-map.d.ts` men-augment `react` JSX `IntrinsicElements` agar elemen custom GoogleMap ter-typecheck.
- **Alasan:** plugin web render element `capacitor-google-map`; TS strict butuh deklarasi.
- **Trade-off:** deklarasi minimal (`DetailedHTMLProps<HTMLAttributes<HTMLElement>>`), opsi lanjutan mengikuti plugin docs.
- **Sumber:** V.3.

### D-009 — Dua komponen UI blueprint diganti solusi web-native
- **Keputusan:** `<GradientSurface/>` → CSS `background: linear-gradient(...)` (utilitas Tailwind inline), `<CollapsingHeader/>` → sticky header + avatar ring (tanpa library). `<ScoreRing/>` memakai `<svg>`/`<circle>` native (bukan react-native-svg).
- **Alasan:** adendum A.2 — semua itu native di web, tidak perlu dependency tambahan (blueprint sendiri menyebut "tidak jadi dibutuhkan sama sekali").
- **Trade-off:** tidak ada komponen reusable tunggal `GradientSurface`; diterapkan inline per-layar.
- **Sumber:** adendum A.2, IV.5.

### D-010 — Font system default, tanpa custom font
- **Keputusan:** memakai font system (Roboto) sesuai `typography.ts` token; tidak menambah custom font-loading.
- **Alasan:** blueprint IV.4 eksplisit — TIDAK menambah custom font-loading untuk performa bundle.
- **Trade-off:** tidak ada identitas font khas, sesuai blueprint.
- **Sumber:** IV.4.

### D-011 — Design token global `#c55a2b` (amber) dipakai sebagai action.primary
- **Keputusan:** `tokens/global.ts` memakai skala amber blueprint (`500: #c55a2b`) — bukan `#d97706` dari `design-tokens.json` web.
- **Alasan:** blueprint IV.1 menstandarkan satu skala amber tunggal `#c55a2b` untuk courier app; UI overhaul didasarkan pada palet eksisting courier (terracotta `#c55a2b`), konsisten dengan audit screenshot.
- **Trade-off:** perbedaan hue tipis vs web admin (`#d97706`); keduanya "oranye hangat", akseptabel untuk app terpisah. Bila nanti mau disatukan, cukup ubah satu token di `tokens/global.ts`.
- **Sumber:** IV.1, IX.5 (warna brand tidak berubah hue antar mode).

### D-012 — Testing: Vitest (unit) + Playwright (e2e web), tanpa Maestro
- **Keputusan:** unit test dengan Vitest (sudah jalan: 24 test), e2e dengan Playwright terhadap build web; plugin native murni (kamera, bg-location, biometric) diuji manual di device.
- **Alasan:** blueprint IX — konsisten dengan web admin yang sudah pakai Playwright; Maestro diganti sesuai adendum A (XI.2).
- **Trade-off:** e2e tidak mencakup native plugin; butuh device lab fisik untuk itu.
- **Sumber:** IX, adendum A (XI.2).

### D-013 — CI/CD: GitHub Actions di repo terpisah untuk Capacitor
- **Keputusan:** workflow `build-apk.yml` untuk folder Capacitor memakai pipeline `lint → typecheck → test → build → cap sync → gradlew assembleDebug` (artifact APK); release signed hanya manual/tag.
- **Alasan:** blueprint IX.3 — build APK release signed hanya dipicu manual/tag, di-upload sebagai artifact.
- **Trade-off:** runner GitHub gratis lambat (15-25 menit); build lokal tetap lebih cepat untuk loop dev.
- **Sumber:** IX.3.

### D-014 — Stub `firebase/messaging` tidak memengaruhi build native
- **Keputusan:** alias hanya di `vite.config.ts` (build web/serve). Build native APK tidak tersentuh karena bundle web di-cap-sync setelah `vite build`.
- **Alasan:** `cap sync` butuh `dist/` hasil `vite build`; alias memastikan build hijau.
- **Trade-off:** tidak ada — konsisten D-001.
- **Sumber:** pipeline.

## 3. Penyimpangan yang Perlu Diverifikasi di Lapangan

- **F7 (uji paralel):** akurasi lokasi, baterai, keandalan sync, kepuasan kurir — belum diukur. Ini blocker F8, di luar jangkauan coding agent.
- **Baterai:** pakai `@capacitor-community/background-geolocation` — perlu verifikasi 4 jam+ di device nyata (blueprint F4 acceptance).
- **Push delay <10 detik:** perlu verifikasi end-to-end dengan admin (blueprint F6 acceptance).

## 4. Catatan Operasional

- `JAVA_HOME=D:\Android\Sdk\jdk-21\jdk-21.0.6+7` (JANGAN JDK 24); `ANDROID_HOME=D:\Android\Sdk`.
- Build lokal: `& .\android\gradlew.bat -p android assembleDebug --no-daemon`.
- Verifikasi file setelah menulis memakai Node `fs.existsSync` (PowerShell Test-Path tidak andal untuk path ber-spasi).
- Typecheck wajib hijau sebelum commit: `npm run typecheck`.
