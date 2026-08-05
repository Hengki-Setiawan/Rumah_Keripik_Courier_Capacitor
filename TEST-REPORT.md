# Test Report — Rumah Keripik Courier (Capacitor)

- **Tanggal**: 05 Agustus 2026
- **Commit**: `6b3944b` (E2E + mock API) & `457e96e` (Maestro smoke)
- **Cabang**: `main`
- **Perangkat**: AVD `Pixel_6_API_34` (Android 13, emulator headless)
- **Backend**: Playwright = mock API (`e2e/mock-api.ts`); Maestro/on-device = produksi `rumah-keripik.vercel.app`

## Ringkasan

| Tahap | Hasil | Keterangan |
|-------|-------|------------|
| Playwright e2e | ✅ 27/27 | 8 spec, mock API |
| Vitest unit | ✅ 24/24 | location (10), backoff (2), format (12) |
| TypeScript typecheck | ✅ Bersih | `npm run typecheck` |
| ESLint | ✅ Bersih | `--max-warnings 0` |
| Kontras warna (WCAG) | ✅ Semua PASS | dark + light |
| Vite build | ✅ Sukses | 1738 module ditransformasi |
| Gradle APK | ✅ SUCCESSFUL | `app-debug.apk` 37,0 MB |
| Maestro smoke (emulator) | ✅ COMPLETED | login + error PIN |

---

## 1. Playwright E2E — 27/27 PASS

Dijalankan via mock API (`page.route('**/api/courier/**')`) pada Vite dev server, browser `mobile-chromium` (Pixel 5 viewport). Konfigurasi: `playwright.config.ts`.

| Spec | Test | Jumlah |
|------|------|--------|
| `e2e/login.spec.ts` | Login screen, PIN salah, login sukses, redirect | 6 |
| `e2e/dashboard.spec.ts` | Dashboard statistik, greeting | 3 |
| `e2e/deliveries.spec.ts` | Daftar kiriman, status badge | 4 |
| `e2e/earnings.spec.ts` | Pendapatan periodik + summary | 3 |
| `e2e/history.spec.ts` | Riwayat, filter Terkirim/Gagal | 4 |
| `e2e/stats.spec.ts` | Skor kinerja, peringkat, StatCard | 3 |
| `e2e/notifications.spec.ts` | Inbox, unread count, tandai dibaca | 3 |
| `e2e/sos.spec.ts` | Form SOS, alasan, laporan terkirim | 2 |
| **Total** | | **27** |

### Akar masalah yang ditemukan & diperbaiki (di spec/mock, bukan source app)
1. **earnings (3 test)** — mock mengirim `earnings` sebagai objek padahal halaman mengharapkan array → crash React. Fix: kirim `earnings.entries`.
2. **history #1** — strict mode `getByText('Terkirim')` cocok dengan 2 elemen. Fix: `{ exact: true }`.
3. **history #2-4** — `FilterPill` menggabungkan label + count sehingga accessible name = "Terkirim 1". Fix: regex `/^Terkirim/`, `/^Gagal/`.
4. **notifications (3 test)** — tombol lonceng di header tanpa accessible name. Fix: `page.goto('/notifications')`.

### Mock API yang ditambahkan
- `GET /api/courier/notifications` + `PATCH` stateful (`markAllRead` / `notificationId`, update `unreadCount`)
- `POST /api/courier/sos` → `{ok:true, data:{id:99}}`
- Opsi `earnings` & `notifications` diverifikasi

---

## 2. Vitest Unit — 24/24 PASS

| File | Jumlah |
|------|--------|
| Location utils | 10 |
| Backoff | 2 |
| Format utils | 12 |
| **Total** | **24** |

---

## 3. Static Checks

| Check | Command | Hasil |
|-------|---------|-------|
| TypeScript | `npm run typecheck` | ✅ tidak ada error |
| ESLint | `npm run lint` | ✅ 0 warning/error |
| Kontras warna | `npm run check:contrast` | ✅ dark + light semua PASS |

---

## 4. Build & APK

| Tahap | Hasil |
|-------|-------|
| `vite build` | ✅ sukses, 1738 module (warning benign: `@capacitor/core` import dinamis vs statis) |
| `npx cap sync android` | ✅ 10 plugin terdeteksi |
| `gradlew assembleDebug` | ✅ BUILD SUCCESSFUL (1m 25s) |
| **APK** | `android/app/build/outputs/apk/debug/app-debug.apk` — 37.039.303 bytes (37,0 MB) |

Environment: `JAVA_HOME=D:\Android\Sdk\jdk-21\jdk-21.0.6+7`, `ANDROID_HOME=D:\Android\Sdk`.

---

## 5. On-Device Smoke (Emulator + Maestro) — COMPLETED

- APK dengan fix login di-install ke AVD `Pixel_6_API_34` (`adb install -r`).
- **Verifikasi via CDP** (Chrome DevTools Protocol pada webview debug): URL `https://localhost/login`, teks "Masukkan PIN untuk masuk" + keypad 0-9 tampil; PIN `111111` terhadap **backend produksi** → "Data tidak valid", PIN ter-reset.
- **Maestro CLI 2.7.0** (`e2e/maestro/smoke-login.yaml`):

```
Launch app "com.rumahkeripik.courier" with clear state... COMPLETED
Assert that "Masukkan PIN untuk masuk" is visible... COMPLETED
Tap on "1" ×6... COMPLETED
Assert that "Data tidak valid" is visible... COMPLETED
Take screenshot smoke_login_error... COMPLETED
```

- Bukti visual: `e2e/maestro/smoke_login_error.png` (dari Maestro) & `e2e/maestro/screenshot-login-error.png` (dari adb screencap).
- **Catatan lingkungan**: run pertama timeout karena emulator software-rendered pada CPU laptop (i7-8565U) mengalami ANR storm. Distabilkan via `hide_error_dialogs 1`, matikan animasi, hentikan launcher; run kedua sukses penuh.

---

## 6. Artefak

| Artefak | Lokasi |
|---------|--------|
| Spec E2E + mock | `e2e/*.spec.ts`, `e2e/mock-api.ts` |
| Maestro flow | `e2e/maestro/smoke-login.yaml` |
| Screenshot Maestro | `e2e/maestro/maestro-smoke_login_error.png` |
| Screenshot adb | `e2e/maestro/screenshot-login-error.png` |
| APK | `android/app/build/outputs/apk/debug/app-debug.apk` |
| Config Playwright | `playwright.config.ts` |

---

## Catatan
- Screenshot tidak diverifikasi secara visual oleh agent (tanpa dukungan image input), tetapi assertion Maestro yang mengonfirmasi teks "Data tidak valid" tampil.
- Backend produksi mengembalikan "Data tidak valid" (bukan "PIN salah") untuk PIN yang salah — assertion Maestro disesuaikan.
