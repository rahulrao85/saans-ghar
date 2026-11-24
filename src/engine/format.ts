import { HOURS_PER_DAY } from './data/day';

const NOON = 12;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2026-11-24T23:00:00+05:30" → year, month, day, hour, minute. */
const ISO_IST = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

/** "7 am", "12 pm", "tomorrow 6 am" for hours since today's midnight (24–47 = tomorrow). */
export function hourLabel(hour: number): string {
  const h = ((hour % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY;
  const clock = h % NOON === 0 ? NOON : h % NOON;
  const label = `${clock} ${h < NOON ? 'am' : 'pm'}`;
  return hour >= HOURS_PER_DAY ? `tomorrow ${label}` : label;
}

/**
 * An IST timestamp in the house date style: "24-Nov-2026 23:00 IST".
 * @returns the input unchanged when it is not ISO 8601.
 */
export function formatIst(iso: string): string {
  const m = ISO_IST.exec(iso);
  if (m === null) return iso;
  const [, y, mo, d, h, mi] = m;
  return `${d}-${MONTHS[Number(mo) - 1] ?? mo}-${y} ${h}:${mi} IST`;
}

/** ISO date (YYYY-MM-DD) in India for a moment in time. */
export function istDate(nowMs: number): string {
  const IST_OFFSET_MS = 19_800_000;
  return new Date(nowMs + IST_OFFSET_MS).toISOString().slice(0, 'YYYY-MM-DD'.length);
}

/** "1,240 µg" — micrograms with Indian digit grouping. */
export function micrograms(value: number): string {
  return `${Math.round(value).toLocaleString('en-IN')} µg`;
}
