# Accessibility

Target: WCAG 2.1 AA, checked automatically and by hand.

- **Automated:** `e2e/app.spec.ts` runs axe (WCAG 2.0/2.1 A and AA rules) on the landing page in light and dark, on the plan, and on every tab, on desktop Chrome and a Pixel 7. The build fails on any violation.
- **Lint:** `eslint-plugin-jsx-a11y` (strict) on every component.
- **Keyboard:** skip link to the plan; the section tabs follow the WAI-ARIA tabs pattern (arrow keys, Home, End, roving tabindex); every control is a native button, link, input or select with a visible focus ring.
- **Screen readers:** the AQI is announced as "AQI 162"; the forecast chart has a text list of every hour; status and AI replies use `aria-live`; tables become labelled cards on phones.
- **Colour:** CPCB band colours always come with the band name, never colour alone. Text on band colours is chosen for at least 4.5:1. The design tokens' orange and blue were deepened where they fell below 4.5:1 at small sizes (`--accent-ink`, tag and hover colours in `src/styles/app.css`).
- **Motion:** honours `prefers-reduced-motion`.
- **Mobile:** 375 px with no horizontal scroll (tested), 44 px tap targets, `inputMode` numeric keypads.
- **Language:** the page is `lang="en-IN"`; every Gemini reply carries `lang="hi"` or `lang="mr"` when written in Hindi or Marathi (built-in replies are English and tagged so).
