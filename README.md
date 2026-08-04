# Rumah Keripik Courier (Capacitor)

Aplikasi kurir Rumah Keripik — migrasi penuh dari Expo/React Native ke **Capacitor 7 + Vite + React 19 + Tailwind CSS 4** (2026). Lihat `DECISIONS_LOG.md` untuk status fase & penyimpangan dari blueprint.

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

Workflow di `.github/workflows/build-apk.yml` — trigger manual (`workflow_dispatch`) atau push/tag ke `main`/`master`. Pipeline: typecheck → contrast → lint → build web → `cap sync` → `assembleRelease` (arm64-v8a) → upload artifact + GitHub Release (saat tag).

Secret yang diperlukan (Repository → Settings → Secrets and variables → Actions):

| Secret | Wajib? | Fungsi |
|---|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | Ya (untuk peta di APK) | API key Google Maps Android |

## Struktur

- `src/pages/` — satu file per layar (`Dashboard`, `Shift`, `Route`, `delivery/[id]`, dll)
- `src/components/ui/` — component library (Button, Card, StatCard, FilterPill, EmptyState, ToggleSwitch, ScoreRing, Sparkline, CollapsingHeader, BottomTabBar, NativeRouteMap)
- `src/lib/` — api-client (CapacitorHttp), background-location, notifications (FCM), live-update (Capgo), secure storage, db (SQLite + Drizzle), sync offline queue
- `src/stores/` — Zustand (auth, delivery, sync, theme)
- `src/tokens/` — design token 3 lapis (global/semantic/component)
