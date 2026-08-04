# Rumah Keripik Courier (Capacitor) — Agent Guide

## Commands
- `npm run dev` / `npm run build` / `npm run typecheck` / `npm run test`
- Build APK: `& .\android\gradlew.bat -p android assembleDebug --no-daemon` dengan `JAVA_HOME=D:\Android\Sdk\jdk-21\jdk-21.0.6+7` (JANGAN JDK 24) dan `ANDROID_HOME=D:\Android\Sdk`.
- `npx cap add android` / `npx cap sync` untuk native; sync butuh `dist/` sudah ter-build.

## Kontrak API (sumber kebenaran: `rumah-kripik-web`)
- `GET /api/courier/deliveries/today` → `{ok, deliveries: CourierDelivery[]}` — **snake_case**: `customer_name`, `customer_phone`, `address`, `latitude`/`longitude`/`distance_km` (TEXT nullable), `route_order`, `created_at`.
- `GET /api/courier/deliveries/:id` → `{ok, delivery}` — **camelCase**: `namaPenerima`, `noHpPenerima`, `alamatPenerima`, `kodePesanan`, `totalBayar`, `catatan`.
- Status valid: `Siap_Dikirim | Dalam_Pengiriman | Terkirim | Gagal` (dari `courier-types.ts`).
- `POST /shift/clock-in` → `{ok, data:{shiftId, clockInAt}}`; `complete` body: `{delivery_id, signature_base64, proof_url, notes}`.
- `GET /earnings?period=daily|weekly|monthly` → `{ok, earnings, summary:{totalConfirmed, pendingTotal}}`.
- `GET /notifications?limit&unread` → `{ok, data:{notifications, unreadCount}}`; `PATCH /notifications` markAllRead atau `{notificationId}`.
- `GET /stats/me?period=week|month` → `{ok, data: StatsMe}` (totalAssigned/Completed/Failed, onTimeRate, totalDistanceKm, incidentCount, score, rank, totalCouriers, completionRate).
- `POST /route/optimize` → `{ok, data:{waypoints: RouteWaypoint[]}}` (lat/lng/sequence/deliveryId).
- Auth: Bearer JWT (access 15m, refresh 30d single-use). Login PIN-only `{pin, deviceId}`.

## Konvensi
- **Write tool dapat intermittent** — selalu verifikasi file setelah menulis; gunakan PowerShell `[IO.File]::WriteAllText` untuk penulisan baru.
- Typecheck wajib hijau sebelum commit: `npm run typecheck`.
- Jangan taruh `App/` dan `app/` bersamaan (case-sensitivity NTFS). Folder Expo lama tidak ada di repo ini.
- Gudang: lat `-5.1340`, lng `119.4135` (Makassar).