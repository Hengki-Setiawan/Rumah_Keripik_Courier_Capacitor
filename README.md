# Rumah Keripik Courier (Capacitor)

Aplikasi kurir Rumah Keripik â€” migrasi penuh dari Expo/React Native ke **Capacitor 7 + Vite + React 19 + Tailwind CSS 4** (2026). Lihat `DECISIONS_LOG.md` untuk status fase & penyimpangan dari blueprint.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Dev server Vite |
| `npm run typecheck` | TypeScript check (`tsc -b --noEmit`) |
| `npm run check:contrast` | Audit kontras WCAG AA token desain |
| `npm run lint` | ESLint (flat config, 0 warning) |
| `npm test` | Unit test (Vitest) |
| `npm run build` | Production build web |
| `npm run verify` | Semua check sekaligus (typecheck + contrast + lint + test + build) |
| `npx cap sync android` | Sync web build ke native Android |
| `npm run db:generate` / `npm run db:push` | Drizzle schema lokal |

## Build APK (lokal)

```
$env:JAVA_HOME='D:\Android\Sdk\jdk-21\jdk-21.0.6+7'
$env:ANDROID_HOME='D:\Android\Sdk'
& .\android\gradlew.bat -p android assembleDebug --no-daemon
```

## Build APK (GitHub Actions)

Workflow di `.github/workflows/build-apk.yml` â€” trigger manual (`workflow_dispatch`) atau push/tag ke `main`/`master`. Pipeline: typecheck â†’ contrast â†’ lint â†’ build web â†’ `cap sync` â†’ `assembleRelease` (arm64-v8a) â†’ upload artifact + GitHub Release (saat tag).

Secret yang diperlukan (Repository â†’ Settings â†’ Secrets and variables â†’ Actions):

| Secret | Wajib? | Fungsi |
|---|---|---|
| VITE_ORS_API_KEY | Tidak (opsional) | API key OpenRouteService utk optimasi rute jalan-asli (ORS); tanpa key fallback otomatis ke OSRM / heuristik TSP lokal |
| VITE_GOOGLE_MAPS_API_KEY | Tidak (legacy) | Tidak dipakai lagi - peta memakai MapLibre GL + tiles OpenFreeMap |

## Struktur

- `src/pages/` â€” satu file per layar (`Dashboard`, `Shift`, `Route`, `delivery/[id]`, dll)
- src/components/ui/ - component library (Button, Card, StatCard, FilterPill, EmptyState, ToggleSwitch, ScoreRing, Sparkline, CollapsingHeader, BottomTabBar, BottomSheet, FAB, StatusBadge, Skeleton, NumpadKey, RouteMap, RouteBottomSheet)
- `src/lib/` â€” api-client (CapacitorHttp), background-location, notifications (FCM), live-update (Capgo), secure storage, db (SQLite + Drizzle), sync offline queue
- src/lib/routing/ - optimasi rute client-side (TSP nearest-neighbor, 2-opt, Or-opt, ORS Matrix utk jarak jalan-asli saat online, ORS client, OSRM fallback, polyline decoder, route cache SQLite TTL 24 jam)
- `src/stores/` â€” Zustand (auth, delivery, sync, theme)
- `src/tokens/` â€” design token 3 lapis (global/semantic/component)