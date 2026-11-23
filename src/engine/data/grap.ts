/** Delhi-NCR GRAP stage implied by an AQI value (not the officially declared stage). */
export type GrapStage = 0 | 1 | 2 | 3 | 4;

/**
 * Lower AQI bound of GRAP stages I–IV, per CAQM's schedule.
 * The declared stage can differ; read it from https://caqm.nic.in.
 */
export const GRAP_FROM: readonly (readonly [number, GrapStage])[] = [
  [201, 1],
  [301, 2],
  [401, 3],
  [451, 4],
];
