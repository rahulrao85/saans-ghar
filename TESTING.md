# Testing

| Layer      | Tool                             | What                                                                                                                                             | Command       |
| ---------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| Engine     | Vitest                           | NAQI breakpoints and the inverse, dose, plan decisions, indoor model, switches, notice, ledger, schedule, explanations                           | `npm test`    |
| Server     | Vitest + Hono `app.request`      | CPCB and Open-Meteo adapters with fake fetch, stale cache, rate limits, CSP, same-origin check, body limits, every route                         | `npm test`    |
| AI         | Vitest with a fake model         | Number guard (incl. Devanagari digits), tool calls, the function-calling loop, fallbacks on bad, slow or invented replies, photo JSON validation | `npm test`    |
| UI         | Vitest + Testing Library (jsdom) | Every component and flow with mocked fetch                                                                                                       | `npm test`    |
| End to end | Playwright + axe                 | Production build and server, no keys, desktop + Pixel 7, both themes, keyboard tabs, no horizontal scroll                                        | `npm run e2e` |

`npm run coverage` enforces the coverage thresholds in `vitest.config.ts`. No test touches the network: every adapter takes an injected `fetchJson`, and e2e serves air data from `e2e/fixtures.ts`.

The counts and coverage figures are whatever the commands print; nothing in this repo hard-codes them.
