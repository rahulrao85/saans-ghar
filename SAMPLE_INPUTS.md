# Sample inputs for evaluators

Open https://saansghar.rahulrao.in and use any of these. No sign-in is needed.

## 1. One-tap demo families

| Button            | Place                  | Family                                                                                                                                                                                                                                |
| ----------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mumbai family** | Chembur, Mumbai | Aai (older adult, sensitive): evening walk 6 pm, 45 min, can move ± 4 h · Sameer (adult): office commute 9 am by two-wheeler, 40 min, can't be skipped · Tara (child): school run 7 am, 15 min, fixed; play 5 pm, 60 min, hard effort |
| **Delhi family**  | Karol Bagh, New Delhi  | Dadaji (older adult, sensitive): morning walk 6 am, 60 min · Priya (adult, sensitive): metro to office 9 am · Kabir (child): cricket 4 pm, 90 min                                                                                     |

Compare the two: on a winter day Delhi's AQI is usually "Very Poor" while Mumbai's is "Satisfactory" or "Moderate", so the same kind of routine gets different advice (shorten, move indoors, or N95 for trips that can't be skipped).

## 2. Search for any place in India

Type an area, a city or a CPCB station name: `Anand Vihar`, `Bandra`, `Pune`, `Lucknow`, `Guwahati`. CPCB stations are listed first. A place with no station within 25 km (for example `Leh`) uses the modelled reading and says "Modelled". "Use my location" also works (the browser asks first).

## 3. Things to try

- **Family tab:** mark someone as sensitive, change a routine's time or flexibility, and watch the plan change on Today.
- **Today → Explain:** pick हिन्दी or मराठी.
- **Home air:** set floor area 150 sq ft and purifier CADR 100 → "too small for smog days"; type an indoor reading higher than outdoors → "something inside is adding smoke".
- **Travel:** two-wheeler, 8 km → see what metro or bus changes in what you breathe and emit.
- **Share:** write the notice in Marathi, then "Share on WhatsApp".
- **Ask:** "When should Aai go for her walk?", "Do masks help?", or a question in Hindi.

## 4. Without an AI key

Run locally with `GEMINI_API_KEY` unset: everything still works and AI text is labelled "Built-in explanation".
