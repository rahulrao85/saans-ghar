# Code Quality

How the code is organised, the rules it is held to, and where each rule is enforced. Everything on this page is checked by `npm run check`, which CI runs on every push.

## Design principles, with the files that apply them

| Principle                    | How it is applied                                                                                                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single responsibility**    | One job per module, named in its opening comment: `aqi.ts` computes the index, `dose.ts` the dose, `plan.ts` the verdicts, `greener.ts` the low-emission switch, `guard.ts` the number check.              |
| **Pure core, thin edges**    | `src/engine/` has no I/O, no clock and no globals: time arrives as an argument (`nowHour`, `nowMs`). Adapters (`server/sources/`), the AI (`server/ai/`) and React (`src/components/`) sit around it.      |
| **Dependency inversion**     | `AirService` takes `fetchJson` and `now`; the app takes `AiModel` (`server/ai/model.ts`), so tests pass a fake model and fake fetch and never touch the network. One composition root: `server/main.ts`.   |
| **Open/closed**              | Tools are a declaration list plus a runner map (`server/ai/tools.ts`); answer rules are a list (`src/engine/answer.ts`); a new tool or rule is one entry.                                                  |
| **One source of truth**      | Breakpoints, breathing rates, travel factors and indoor constants live in `src/engine/data/` with their citations. zod schemas in `src/schemas/` are shared by browser and server, and types are inferred. |
| **One behaviour, one place** | The engine runs in the browser and on the server (rules fallbacks), so there is no second implementation of the plan, the explanation or the notice.                                                       |
| **Fail soft, say so**        | Every upstream has a fallback that is labelled in the UI: stale CPCB data, modelled air, built-in explanation.                                                                                             |

## Layers

A module may import its own layer or a lower one, never upwards.

| Layer | Folder                                                                                              | May import                    |
| ----- | --------------------------------------------------------------------------------------------------- | ----------------------------- |
| 0     | `src/engine/data/`                                                                                  | nothing                       |
| 1     | `src/engine/`, `src/schemas/`                                                                       | layer 0                       |
| 2     | `server/sources/`, `server/ai/`, `server/cache.ts`, `server/http.ts`, `server/log.ts`, `src/api.ts` | layers 0–1                    |
| 3     | `server/air.ts`, `server/places.ts`, `server/aiRoutes.ts`, `src/state/`                             | layers 0–2                    |
| 4     | `server/app.ts`, `src/components/`, `src/App.tsx`                                                   | layers 0–3                    |
| 5     | `server/main.ts`, `src/main.tsx`                                                                    | everything (composition root) |

## Rules and where they are enforced

| Rule                                                                                      | Enforced by                                |
| ----------------------------------------------------------------------------------------- | ------------------------------------------ |
| TypeScript `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, no `any`   | `tsconfig.json`, `npm run typecheck`       |
| ESLint `strictTypeChecked` + `stylisticTypeChecked`, react-hooks, jsx-a11y strict         | `eslint.config.js`, `npm run lint`         |
| Cyclomatic complexity ≤ 10, nesting ≤ 3, ≤ 4 parameters                                   | `eslint.config.js`                         |
| ≤ 200 lines per file; ≤ 40 lines per logic function (90 for components, which are markup) | `eslint.config.js`                         |
| No magic numbers in logic files: every constant is named, most with a source              | `@typescript-eslint/no-magic-numbers`      |
| No duplicated code (threshold 0)                                                          | `.jscpd.json`, `npm run lint:dupes`        |
| No unused files, exports or dependencies                                                  | `knip.json`, `npm run lint:unused`         |
| One format                                                                                | `.prettierrc.json`, `npm run format:check` |
| JSDoc on every exported function, type and constant                                       | `eslint-plugin-jsdoc` (`require-jsdoc`)    |
| 100% statement, branch, function and line coverage                                        | `vitest.config.ts` thresholds              |
| No generated output committed (`dist/`, `coverage/`, test results)                        | `.gitignore`                               |

## Naming and style

Google TypeScript style: `camelCase` functions and variables, `PascalCase` types and components, `UPPER_SNAKE` constants, named exports only, no default exports in source, `readonly` data shapes, `interface` for object types. Errors are handled with `instanceof Error`, never cast.
