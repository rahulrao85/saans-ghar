import { describe, expect, it } from 'vitest';
import { inDelhiNcr, istHour } from '../../src/engine/geoTypes';

describe('istHour', () => {
  it('converts UTC to the hour in India', () => {
    expect(istHour(Date.UTC(2026, 10, 24, 5, 30))).toBe(11);
    expect(istHour(Date.UTC(2026, 10, 24, 18, 29))).toBe(23);
    expect(istHour(Date.UTC(2026, 10, 24, 18, 30))).toBe(0);
  });
});

describe('inDelhiNcr', () => {
  it('matches Delhi by state or NCR cities by name', () => {
    expect(inDelhiNcr('Anand Vihar', 'Delhi')).toBe(true);
    expect(inDelhiNcr('anywhere', 'DELHI')).toBe(true);
    expect(inDelhiNcr('Noida', 'Uttar Pradesh')).toBe(true);
    expect(inDelhiNcr('Greater Noida', 'Uttar Pradesh')).toBe(true);
    expect(inDelhiNcr('Gurugram', 'Haryana')).toBe(true);
  });

  it('rejects other cities', () => {
    expect(inDelhiNcr('Mumbai', 'Maharashtra')).toBe(false);
  });
});
