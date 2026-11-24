import type { AirReportData } from '../../src/schemas/air';

/** 00:30 IST on 24-Nov-2026: every forecast hour 0..47 is still ahead. */
export const IST_MIDNIGHT = '2026-11-23T19:00:00Z';
/** 22:30 IST on 24-Nov-2026: today's routines move to tomorrow. */
export const IST_LATE = '2026-11-24T17:00:00Z';

/** Cleanest around 2 pm, dirtiest at night; tomorrow repeats today. */
export function forecast48(): AirReportData['forecast'] {
  return Array.from({ length: 48 }, (_, hour) => ({
    hour,
    pm25: 30 + 6 * Math.abs((hour % 24) - 14),
  }));
}

/** A shallow mixing layer before 6 am, deepest in the afternoon. */
function weather48(): AirReportData['weather'] {
  return Array.from({ length: 48 }, (_, hour) => {
    const h = hour % 24;
    return {
      hour,
      mixingHeightM: h < 6 ? 300 : 1500 - 60 * Math.abs(h - 14),
      windKmh: 4 + (h % 5),
    };
  });
}

export function airReport(over: Partial<AirReportData> = {}): AirReportData {
  return {
    source: 'cpcb',
    station: {
      name: 'Borivali East, Mumbai - MPCB',
      city: 'Mumbai',
      state: 'Maharashtra',
      updated: '2026-11-24T09:00:00+05:30',
      km: 1.7,
    },
    aqi: {
      aqi: 162,
      band: {
        category: 'Moderate',
        low: 101,
        high: 200,
        colour: '#FFFF00',
        health: 'Breathing discomfort to people with lungs, asthma and heart diseases.',
      },
      dominant: 'PM2.5',
      subIndices: {},
      complete: true,
    },
    pm25: 78,
    forecast: forecast48(),
    weather: weather48(),
    stale: false,
    ...over,
  };
}

/** No CPCB station within range: the Open-Meteo model only. */
export const modelReport = (): AirReportData =>
  airReport({ source: 'model', station: null, aqi: null, pm25: null });

export const noAqiReport = (): AirReportData => airReport({ aqi: null });

export const staleReport = (): AirReportData => airReport({ stale: true });

export function incompleteReport(): AirReportData {
  const base = airReport();
  return airReport({ aqi: base.aqi && { ...base.aqi, complete: false }, pm25: null });
}

export function delhiReport(): AirReportData {
  const base = airReport();
  return airReport({
    station: base.station && {
      ...base.station,
      name: 'Anand Vihar, Delhi - DPCC',
      city: 'Delhi',
      state: 'Delhi',
    },
  });
}

export function severeReport(): AirReportData {
  const base = airReport();
  return airReport({
    aqi: base.aqi && {
      ...base.aqi,
      aqi: 480,
      band: { ...base.aqi.band, category: 'Severe', low: 401, high: 500, colour: '#7E0023' },
    },
    pm25: 300,
  });
}
