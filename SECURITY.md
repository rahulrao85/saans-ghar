# Security

## What the app protects

- **Secrets** stay on the server: `GEMINI_API_KEY` and `DATA_GOV_API_KEY` are read from the environment and never sent to the browser or written to logs. `.env` is git-ignored; `.env.example` lists the names only.
- **No accounts, no personal data on the server.** The family and the weekly ledger live in the browser's localStorage. The server sees a location rounded to about 1 km (`server/air.ts`, `coarse`) and the plan facts the AI explains.
- **Photos** are downscaled and re-encoded in the browser (dropping EXIF such as GPS), sent once for reading, and never stored.

## Controls

| Risk                   | Control                                                                                                                                                                                                    | Where                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Cross-site scripting   | Strict CSP: `default-src 'self'`, no inline scripts or styles; React escapes all text                                                                                                                      | `server/http.ts`                                       |
| Clickjacking, sniffing | `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, HSTS, strict referrer, permissions policy (camera and geolocation self-only)                                                                       | `server/http.ts`                                       |
| Cross-site writes      | Every non-GET request must have an `Origin` whose host matches `Host`; a malformed Origin is a 403                                                                                                         | `server/http.ts`                                       |
| Abuse and cost         | Rate limits: 60 requests/min per client, 12/min for AI routes; body limits 8 KB (API), 32 KB (AI), 1 MB (photo)                                                                                            | `server/app.ts`, `server/aiRoutes.ts`                  |
| Bad input              | Every request body and query is validated with zod; responses from CPCB and Open-Meteo are validated too                                                                                                   | `server/aiRoutes.ts`, `server/sources/*`               |
| Prompt injection       | Names and labels are passed as JSON data with an instruction to treat them as data; the model has only read-only tools over the user's own facts; the number guard drops any reply with an invented figure | `server/ai/*`                                          |
| Model hallucination    | Number guard + rules fallback; photo readings need user confirmation                                                                                                                                       | `server/ai/guard.ts`, `src/components/PhotoReader.tsx` |
| Upstream outages       | Stale-while-failing cache; timeouts on every fetch                                                                                                                                                         | `server/cache.ts`, `server/fetchJson.ts`               |
| Container              | Two-stage image, production dependencies only, runs as a non-root user                                                                                                                                     | `Dockerfile`                                           |

## Reporting

Please report a vulnerability privately to the repository owner through GitHub rather than in a public issue.
