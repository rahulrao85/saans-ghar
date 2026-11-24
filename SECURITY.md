# Security

## What the app protects

- **Secrets** stay on the server: `GEMINI_API_KEY` and `DATA_GOV_API_KEY` are read from the environment and never sent to the browser or written to logs. `.env` is git-ignored; `.env.example` lists the names only.
- **No accounts, no personal data on the server.** The family and the weekly ledger live in the browser's localStorage. The server receives the chosen coordinates and rounds them to about 1 km before using them (`server/air.ts`, `coarse`). AI requests carry first names, routine labels, the area name and air numbers, never coordinates; the UI says so next to each AI button.
- **Photos** are downscaled and re-encoded in the browser (dropping EXIF such as GPS), sent once for reading, and never stored.

## Controls

| Risk                   | Control                                                                                                                                                                                                                                  | Where                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Cross-site scripting   | Strict CSP: `default-src 'self'`, no `unsafe-inline` for scripts or styles (the few dynamic styles, such as chart bar heights, are set through React's DOM style API, which the CSP allows); React escapes all text                      | `server/http.ts`                                       |
| Clickjacking, sniffing | `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, HSTS, strict referrer, permissions policy (camera and geolocation self-only)                                                                                               | `server/http.ts`                                       |
| Cross-site writes      | Every non-GET request must have an `Origin` whose host matches `Host`; a malformed Origin is a 403                                                                                                                                       | `server/http.ts`                                       |
| Abuse and cost         | Rate limits per client address (the last `X-Forwarded-For` hop, set by the Caddy proxy in production; expired windows are pruned): 60 requests/min, 12/min for AI routes; body limits 8 KB (API), 32 KB (AI), 1 MB (photo)               | `server/app.ts`, `server/aiRoutes.ts`                  |
| Bad input              | Every request body and query is validated with zod; responses from CPCB and Open-Meteo are validated too                                                                                                                                 | `server/aiRoutes.ts`, `server/sources/*`               |
| Prompt injection       | Names and labels are passed as JSON data with an instruction to treat them as data; the model has only read-only tools over the user's own facts; the number guard drops any reply with an invented figure or a number spelled as a word | `server/ai/*`                                          |
| Model hallucination    | Number guard + rules fallback; photo readings need user confirmation                                                                                                                                                                     | `server/ai/guard.ts`, `src/components/PhotoReader.tsx` |
| Upstream outages       | Stale-while-failing cache; timeouts on every fetch                                                                                                                                                                                       | `server/cache.ts`, `server/fetchJson.ts`               |
| Container              | Two-stage image, production dependencies only, runs as a non-root user                                                                                                                                                                   | `Dockerfile`                                           |

## Supply chain

- `npm audit --omit=dev --audit-level=high` runs in CI on every push.
- CodeQL (security-extended, including ReDoS queries) analyses the code on every push (`.github/workflows/codeql.yml`).
- Dependency review blocks pull requests that add a vulnerable or GPL-licensed dependency (`.github/workflows/dependency-review.yml`).
- The lockfile is committed and the image installs with `npm ci`.

## Reporting

Please report a vulnerability privately through [GitHub security advisories](https://github.com/rahulrao85/saans-ghar/security/advisories/new) rather than in a public issue. The site publishes this at `/.well-known/security.txt`.
