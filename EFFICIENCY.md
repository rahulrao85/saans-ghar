# Efficiency

Fast on Indian mobile data, light on the free upstream APIs, and cheap to run (₹0: a small container, free data and AI tiers).

## Network and data

| Technique                     | Detail                                                                                                                             | Where                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| One national download, shared | CPCB stations are fetched as one paged national feed and cached for 30 minutes for every visitor, instead of one call per user     | `server/air.ts`                             |
| Stale-while-failing cache     | If data.gov.in fails (it often returns 502), the last good copy is served and marked stale rather than blanking the app            | `server/cache.ts`                           |
| Request de-duplication        | Concurrent requests for the same key share one in-flight upstream call                                                             | `server/cache.ts` (`loadOnce`)              |
| Rounded locations             | Points are rounded to about 1 km before the forecast lookup, so nearby users share cache entries (and privacy improves)            | `src/engine/geoTypes.ts` (`coarse`)         |
| Forecast cache                | Open-Meteo forecast and weather are fetched together in parallel and cached for 1 hour per rounded point                           | `server/air.ts`                             |
| HTTP caching                  | Air and place lookups send `Cache-Control: private, max-age=300`; AI replies `no-store`; hashed assets `immutable` for a year      | `server/app.ts`, `server/main.ts`           |
| Timeouts                      | Upstream fetches time out (70 s for data.gov.in, 25 s for Gemini) and fall back                                                    | `server/fetchJson.ts`, `server/ai/model.ts` |
| Cache warm-up                 | The station cache is filled at start-up, so the first visitor does not wait                                                        | `server/main.ts`                            |
| Refresh only when useful      | The browser refreshes the report every 15 minutes and when the tab becomes visible again, keeping the old plan on screen meanwhile | `src/state/hooks.ts`                        |

## Front end

| Technique                 | Detail                                                                                                  | Where                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Precompressed assets      | Brotli and gzip copies are written at build time and served directly; nothing is compressed per request | `scripts/precompress.mjs`               |
| Bundle budget             | CI fails if shipped JavaScript or CSS exceeds its gzip budget (130 KB JS, 8 KB CSS)                     | `scripts/bundle-budget.mjs`             |
| One small font            | Only Space Grotesk 700, Latin subset, self-hosted; body text uses the system font                       | `src/main.tsx`                          |
| Only the open tab renders | Hidden tab panels render nothing                                                                        | `src/components/Panels.tsx`             |
| Memoised plan             | The plan is recomputed only when the household or the report changes                                    | `src/App.tsx` (`useMemo`)               |
| Photos shrunk on device   | Photos are downscaled to 800 px JPEG in the browser (about 100 KB) before upload                        | `src/components/shrinkImage.ts`         |
| No layout shift           | Fixed-size AQI badge and chart; the theme is set before first paint                                     | `src/styles/app.css`, `public/theme.js` |

## Server

- One Node process serves the API and the static app; the image is two-stage with production dependencies only (`Dockerfile`).
- The engine is pure and synchronous; a full family plan is a few hundred arithmetic operations.
- AI calls are rate-limited (12 a minute per client) and use the smallest free model that answers reliably within the timeout.
