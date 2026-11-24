import { describe, expect, it } from 'vitest';
import { allowedNumbers, isGrounded, numbersIn } from '../../server/ai/guard';

describe('numbersIn', () => {
  it('finds integers, decimals and grouped numbers', () => {
    expect(numbersIn('AQI 162, PM2.5 78.4, 1,24,000 and 1,240')).toEqual([
      162, 2.5, 78.4, 124000, 1240,
    ]);
  });

  it('reads Devanagari digits as ASCII', () => {
    expect(numbersIn('एक्यूआई १६२ और ७८.४, १,२४,०००')).toEqual([162, 78.4, 124000]);
  });

  it('returns nothing for text without numbers', () => {
    expect(numbersIn('no digits here')).toEqual([]);
  });
});

describe('allowedNumbers', () => {
  it('always allows the names PM2.5, PM10 and N95', () => {
    const allowed = allowedNumbers();
    expect([2.5, 10, 95].every((n) => allowed.has(n))).toBe(true);
  });

  it('adds each fact and its rounded form', () => {
    const allowed = allowedNumbers({ pm25: 78.4 }, 1240.6);
    expect(allowed.has(78.4)).toBe(true);
    expect(allowed.has(78)).toBe(true);
    expect(allowed.has(1240.6)).toBe(true);
    expect(allowed.has(1241)).toBe(true);
  });

  it('adds clock forms of hours since midnight', () => {
    expect(allowedNumbers(30).has(6)).toBe(true);
    expect(allowedNumbers(30).has(30)).toBe(true);
    expect(allowedNumbers(12).has(12)).toBe(true);
    expect(allowedNumbers(0).has(12)).toBe(true);
    expect(allowedNumbers(13).has(1)).toBe(true);
  });

  it('gives no clock forms to fractions or numbers past the forecast', () => {
    expect(allowedNumbers(48).has(12)).toBe(false);
    expect(allowedNumbers(48).has(0)).toBe(false);
    expect(allowedNumbers(5.5).has(5)).toBe(false);
  });
});

describe('isGrounded', () => {
  const allowed = allowedNumbers({ aqi: 162, hour: 14 });

  it('accepts a reply made of allowed numbers only', () => {
    expect(isGrounded('AQI 162 at 2 pm, with an N95 and PM2.5', allowed)).toBe(true);
    expect(isGrounded('no numbers at all', allowed)).toBe(true);
  });

  it('rejects a reply with an invented number', () => {
    expect(isGrounded('AQI 163 today', allowed)).toBe(false);
  });
});
