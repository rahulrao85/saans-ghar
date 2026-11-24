import { describe, expect, it } from 'vitest';
import { weatherReason } from '../../src/engine/why';

const weather = [
  { hour: 7, mixingHeightM: 304, windKmh: 3 },
  { hour: 14, mixingHeightM: 1203, windKmh: 12 },
  { hour: 15, mixingHeightM: 400, windKmh: 12 },
  { hour: 16, mixingHeightM: 800, windKmh: 12 },
];

describe('weatherReason', () => {
  it('explains a trapped, shallow usual hour', () => {
    expect(weatherReason(weather, 7, 14)).toBe(
      'The air layer that dilutes smoke is ~1200 m deep then, versus ~300 m at the usual time, so smoke stays trapped near the ground.',
    );
  });

  it('explains without the trapped note when the usual layer is not shallow', () => {
    expect(weatherReason(weather, 16, 14)).toBe(
      'The air layer that dilutes smoke is ~1200 m deep then, versus ~800 m at the usual time.',
    );
  });

  it('is null when the difference is small', () => {
    expect(weatherReason(weather, 15, 16)).toBe(
      'The air layer that dilutes smoke is ~800 m deep then, versus ~400 m at the usual time, so smoke stays trapped near the ground.',
    );
    expect(weatherReason(weather, 14, 16)).toBeNull();
  });

  it('is null when an hour has no weather', () => {
    expect(weatherReason(weather, 99, 14)).toBeNull();
    expect(weatherReason(weather, 7, 99)).toBeNull();
    expect(weatherReason([], 7, 14)).toBeNull();
  });
});
