/** Hindi and Marathi replies may use Devanagari digits; compare them as ASCII. */
const DEVANAGARI = '०१२३४५६७८९';
const DEVANAGARI_DIGITS = /[०-९]/g;
/** Numbers as written: 1,240 or 1,24,000 or 45.3. */
const NUMBER = /\d[\d,]*(?:\.\d+)?/g;
const HOURS_PER_HALF_DAY = 12;
const LAST_FORECAST_HOUR = 47;
/** Numbers that are names, not claims: PM2.5, PM10, N95. */
const PM25_NAME = 2.5;
const PM10_NAME = 10;
const N95_NAME = 95;
const NAMES: readonly number[] = [PM25_NAME, PM10_NAME, N95_NAME];

function toAscii(text: string): string {
  return text.replace(DEVANAGARI_DIGITS, (d) => String(DEVANAGARI.indexOf(d)));
}

/** Every number written in a piece of text. */
export function numbersIn(text: string): number[] {
  return (toAscii(text).match(NUMBER) ?? []).map((n) => Number(n.replaceAll(',', '')));
}

/** Clock-face forms of an hour since midnight (30 → 6, 13 → 1, 12 → 12). */
function clockForms(hour: number): number[] {
  const h = hour % HOURS_PER_HALF_DAY;
  return [hour, hour % (2 * HOURS_PER_HALF_DAY), h === 0 ? HOURS_PER_HALF_DAY : h];
}

/** The numbers a reply may contain: each fact, its rounded form, and hours as clock times. */
export function allowedNumbers(...sources: readonly unknown[]): Set<number> {
  const allowed = new Set<number>(NAMES);
  for (const n of numbersIn(JSON.stringify(sources))) {
    allowed.add(n).add(Math.round(n));
    if (Number.isInteger(n) && n >= 0 && n <= LAST_FORECAST_HOUR) {
      for (const c of clockForms(n)) allowed.add(c);
    }
  }
  return allowed;
}

/**
 * True when every number in the reply is one code computed. A reply that
 * invents a figure (an AQI, a dose, an hour) is thrown away.
 */
export function isGrounded(text: string, allowed: ReadonlySet<number>): boolean {
  return numbersIn(text).every((n) => allowed.has(n));
}
