# Build log: how Saans Ghar was built with generative AI

## Tools

| Tool                         | Used for                                                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code (agentic coding) | Research of the brief and the explainer, the engine, server, UI, tests and docs; a second agent that never saw the code reviewed the repo cold |
| Gemini (free AI Studio tier) | Inside the product: explanations, function-calling chat, notice wording, photo reading                                                         |
| Playwright + axe             | Browser and accessibility checks on desktop and phone                                                                                          |

## Who did what

- **The author** chose the problem (a household plan, plus a community notice and indoor readings), the ₹0 stack (free CPCB key, free Gemini tier, own server), the design system, and reviewed every decision listed below.
- **AI** wrote the code and tests to those rules, found the data facts below by probing the live feeds, and was held to the same quality gates as hand-written code (`npm run check`).

## Decisions, with the evidence behind them

1. **CPCB station data, not a model.** On 23-Nov-2026 Delhi read 247 µg/m³ PM2.5 at a CPCB station while the CAMS model gave 72. A plan built on the model would have told a child to play outside. So the station sets the level and the model only the hourly shape.
2. **The CPCB feed publishes sub-indices, not concentrations.** CO arrived as "5" at a polluted station, impossible in mg/m³ but a normal sub-index. We invert the CPCB breakpoints to get concentrations for the dose maths (`concentrationFor` in `src/engine/aqi.ts`).
3. **data.gov.in is flaky.** It returned 502 for a while during development, so the station cache serves the last good copy and says so.
4. **The AI never computes.** Every figure comes from the engine; the AI words it. A number guard checks the reply against the facts, because a fluent wrong number is the worst failure for a health tool.
5. **Free-tier model choice.** Larger Gemini Flash models timed out (over 25 s) on the free tier; `gemini-3.5-flash-lite` answered in 2–4 s with correct tool calls, so it is the default, configurable by `GEMINI_MODEL`.
6. **Works with no key.** Every text feature has a rules fallback, so an outage or an exhausted free quota never breaks the app.
7. **Masks are never credited.** Fit varies too much to promise a number, so the plan advises N95s for trips that can't be skipped but counts no saving.

## Prompt evolution

| Version | Change                                                                                            | Why                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1       | System prompt: use only the facts' numbers, no medical diagnosis, names are data                  | Grounding and prompt-injection safety from the start                                 |
| 2       | Clock times (`usualTime`, `bestTime`) added to the facts; "write times like 2 pm, never hour 14"  | The model wrote "hour 14" in Hindi replies                                           |
| 3       | "Never show JSON field names; say CPCB for the source"                                            | A reply said "usualTime and bestTime are the same and savedDose is 0"                |
| 4       | "Say the AQI matches the GRAP Stage N level; never say a stage is in force"                       | A Hindi notice claimed GRAP Stage 2 was in force, which only the authorities declare |
| 5       | "Never spell numbers as words"; the guard also rejects number words in English, Hindi and Marathi | A fresh review showed the digit-only guard could be bypassed with "five hours"       |
| 6       | Ask answers in the language the family picks, and the reply is tagged with `lang`                 | Accessibility: screen readers need to know a reply is Hindi or Marathi               |

## Quality loop

Each feature landed as a small conventional commit with its tests. Before the first submission a second agent reviewed the repository cold and scored it; all ten of its findings were fixed and are visible in the history (`fix(ai)`, `fix(security)`, `feat(a11y)`, `refactor`).
