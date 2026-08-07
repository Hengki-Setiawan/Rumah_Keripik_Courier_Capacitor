# Rumah Keripik Courier (Capacitor) â€” Agent Guide

## Commands
- `npm run dev` / `npm run build` / `npm run typecheck` / `npm run test`
- Build APK: `& .\android\gradlew.bat -p android assembleDebug --no-daemon` dengan `JAVA_HOME=D:\Android\Sdk\jdk-21\jdk-21.0.6+7` (JANGAN JDK 24) dan `ANDROID_HOME=D:\Android\Sdk`.
- `npx cap add android` / `npx cap sync` untuk native; sync butuh `dist/` sudah ter-build.

## Kontrak API (sumber kebenaran: `rumah-kripik-web`)
- `GET /api/courier/deliveries/today` â†’ `{ok, deliveries: CourierDelivery[]}` â€” **snake_case**: `customer_name`, `customer_phone`, `address`, `latitude`/`longitude`/`distance_km` (TEXT nullable), `route_order`, `created_at`.
- `GET /api/courier/deliveries/:id` â†’ `{ok, delivery}` â€” **camelCase**: `namaPenerima`, `noHpPenerima`, `alamatPenerima`, `kodePesanan`, `totalBayar`, `catatan`.
- Status valid: `Siap_Dikirim | Dalam_Pengiriman | Terkirim | Gagal` (dari `courier-types.ts`).
- `POST /shift/clock-in` â†’ `{ok, data:{shiftId, clockInAt}}`; `complete` body: `{delivery_id, signature_base64, proof_url, notes}`.
- `GET /earnings?period=daily|weekly|monthly` â†’ `{ok, earnings, summary:{totalConfirmed, pendingTotal}}`.
- `GET /notifications?limit&unread` â†’ `{ok, data:{notifications, unreadCount}}`; `PATCH /notifications` markAllRead atau `{notificationId}`.
- `GET /stats/me?period=week|month` â†’ `{ok, data: StatsMe}` (totalAssigned/Completed/Failed, onTimeRate, totalDistanceKm, incidentCount, score, rank, totalCouriers, completionRate).
- `POST /route/optimize` â†’ `{ok, data:{waypoints: RouteWaypoint[]}}` (lat/lng/sequence/deliveryId).
- Auth: Bearer JWT (access 15m, refresh 30d single-use). Login PIN-only `{pin, deviceId}`.

## Konvensi
- **DANGER path**: repo ini berada di D:\Vibe coding (Semester 7)\Rumah Keripik\Rumah_Keripik_Courier_Capacitor (parent Rumah Keripik **dengan spasi**). JANGAN pernah menulis/merujuk path ..\Rumah_Keripik\... atau D:\...\Rumah_Keripik\... (underscore) — itu membuat folder duplikat (kejadian 08 Aug 2026, sudah dihapus). Selalu gunakan path penuh dengan spasi.
- **Write tool dapat intermittent** â€” selalu verifikasi file setelah menulis; gunakan PowerShell `[IO.File]::WriteAllText` untuk penulisan baru.
- Typecheck wajib hijau sebelum commit: `npm run typecheck`.
- Jangan taruh `App/` dan `app/` bersamaan (case-sensitivity NTFS). Folder Expo lama tidak ada di repo ini.
- Gudang: lat `-5.1340`, lng `119.4135` (Makassar).