import { describe, expect, it } from 'vitest';
import { isVulnerable, type Member } from '../../src/engine/household';

const adult: Member = { id: 'dad', name: 'Rohan', group: 'adult', sensitive: false, routines: [] };
const nani: Member = { ...adult, id: 'nani', name: 'Nani', group: 'elder' };
const child: Member = { ...adult, id: 'aarav', name: 'Aarav', group: 'child' };

describe('isVulnerable', () => {
  it('treats children, elders and sensitive adults as vulnerable', () => {
    expect(isVulnerable(nani)).toBe(true);
    expect(isVulnerable(child)).toBe(true);
    expect(isVulnerable(adult)).toBe(false);
    expect(isVulnerable({ ...adult, sensitive: true })).toBe(true);
  });
});
