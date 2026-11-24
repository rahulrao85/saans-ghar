import type { Page } from '@playwright/test';

/** A Mumbai report shaped like /api/air, with a clear evening peak. */
function airReport(): unknown {
  const forecast = Array.from({ length: 48 }, (_, hour) => ({
    hour,
    pm25: 40 + 40 * Math.max(0, Math.sin(((hour % 24) - 12) / 4)),
  }));
  const weather = Array.from({ length: 48 }, (_, hour) => ({
    hour,
    mixingHeightM: hour % 24 > 10 && hour % 24 < 17 ? 1200 : 300,
    windKmh: 6,
  }));
  return {
    source: 'cpcb',
    station: {
      name: 'Borivali East, Mumbai - MPCB',
      city: 'Mumbai',
      state: 'Maharashtra',
      updated: new Date().toISOString(),
      km: 1.7,
    },
    aqi: {
      aqi: 162,
      band: {
        category: 'Moderate',
        low: 101,
        high: 200,
        colour: '#FFFF00',
        health:
          'Breathing discomfort for people with lung or heart disease, children and older adults.',
      },
      dominant: 'PM2.5',
      subIndices: { 'PM2.5': 162 },
      complete: true,
    },
    pm25: 78,
    forecast,
    weather,
    stale: false,
  };
}

/** Serve the air report from the fixture so tests never depend on CPCB being up. */
export async function stubAir(page: Page): Promise<void> {
  await page.route('**/api/air?**', (route) => route.fulfill({ json: airReport() }));
}
