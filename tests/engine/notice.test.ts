import { describe, expect, it } from 'vitest';
import { fallbackNotice, grapStageFor, noticeFacts, outdoorCall } from '../../src/engine/notice';

describe('notice', () => {
  it.each([
    [80, 'normal'],
    [150, 'reduce'],
    [250, 'move-indoors'],
    [380, 'cancel'],
  ] as const)('AQI %d → %s', (aqi, call) => {
    expect(outdoorCall(aqi)).toBe(call);
  });
  it.each([
    [150, 0],
    [201, 1],
    [350, 2],
    [420, 3],
    [480, 4],
  ] as const)('AQI %d implies GRAP stage %d', (aqi, stage) => {
    expect(grapStageFor(aqi)).toBe(stage);
  });
  it('includes the GRAP stage only for Delhi-NCR', () => {
    expect(noticeFacts('Dwarka, Delhi', 350, true, 14).grapStage).toBe(2);
    expect(noticeFacts('Chembur, Mumbai', 350, false, null).grapStage).toBeNull();
  });
  it('writes a plain fallback notice', () => {
    expect(fallbackNotice(noticeFacts('Dwarka, Delhi', 350, true, 38))).toBe(
      'Air quality in Dwarka, Delhi: AQI 350, Very Poor (GRAP Stage 2 level). ' +
        'Please cancel all outdoor activity today and keep windows shut during smog hours. ' +
        'The cleanest hour today is around 14:00.',
    );
    expect(fallbackNotice(noticeFacts('Pune', 90, false, null))).toBe(
      'Air quality in Pune: AQI 90, Satisfactory. Outdoor play and PE can go ahead as usual.',
    );
  });
});
