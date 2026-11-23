/** One hour of forecast PM2.5. */
export interface HourlyPm {
  /** Hours since local midnight today (24–47 is tomorrow). */
  readonly hour: number;
  /** PM2.5 in µg/m³. */
  readonly pm25: number;
}

/** A forecast scaled to match the live station reading. */
export interface CalibratedForecast {
  readonly hours: readonly HourlyPm[];
  /** Multiplier applied to the model values. */
  readonly factor: number;
}

/** Model and station rarely differ by more than this; beyond it we distrust the model. */
const MIN_FACTOR = 0.25;
const MAX_FACTOR = 4;

/**
 * Scale a modelled hourly forecast so the current hour matches the measured
 * station value. Models such as Open-Meteo under-read Indian winter smog
 * (Delhi, 23-Nov-2026: model 72 vs CPCB 247 µg/m³), so the shape is kept and
 * the level is taken from the station.
 */
export function calibrate(
  model: readonly HourlyPm[],
  observedPm25: number,
  currentHour: number,
): CalibratedForecast {
  const now = model.find((h) => h.hour === currentHour);
  const raw = now !== undefined && now.pm25 > 0 ? observedPm25 / now.pm25 : 1;
  const factor = Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, raw));
  return {
    factor,
    hours: model.map((h) => ({ hour: h.hour, pm25: Math.round(h.pm25 * factor) })),
  };
}

/**
 * Average PM2.5 over `span` consecutive hours starting at `start`.
 * @returns null when any hour in the span is missing.
 */
export function meanOver(hours: readonly HourlyPm[], start: number, span: number): number | null {
  let total = 0;
  for (let h = start; h < start + span; h++) {
    const slot = hours.find((x) => x.hour === h);
    if (slot === undefined) return null;
    total += slot.pm25;
  }
  return total / span;
}
