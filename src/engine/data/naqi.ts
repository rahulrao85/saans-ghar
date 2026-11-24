/**
 * CPCB National Air Quality Index (NAQI) breakpoints, 2014.
 * Source: CPCB "National Air Quality Index" (2014), as summarised by
 * https://ies.gov.in/arthapedia/concept/national-air-quality-index
 * Units: µg/m³, except CO in mg/m³.
 */

/** Pollutants the CPCB live feed reports. */
export type Pollutant = 'PM2.5' | 'PM10' | 'NO2' | 'SO2' | 'CO' | 'OZONE' | 'NH3';

/** Every pollutant, in CPCB's order. */
export const POLLUTANTS: readonly Pollutant[] = [
  'PM2.5',
  'PM10',
  'NO2',
  'SO2',
  'CO',
  'OZONE',
  'NH3',
];

/** NAQI category names, lowest to highest. */
export type AqiCategory = 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';

/** One NAQI band: the index range and its label. */
export interface AqiBand {
  readonly category: AqiCategory;
  readonly low: number;
  readonly high: number;
  /** CPCB colour for the band. */
  readonly colour: string;
  /** CPCB's health statement for the band. */
  readonly health: string;
}

/** Index ranges shared by every pollutant. */
export const AQI_BANDS: readonly AqiBand[] = [
  { category: 'Good', low: 0, high: 50, colour: '#00B050', health: 'Minimal impact.' },
  {
    category: 'Satisfactory',
    low: 51,
    high: 100,
    colour: '#92D050',
    health: 'Minor breathing discomfort for sensitive people.',
  },
  {
    category: 'Moderate',
    low: 101,
    high: 200,
    colour: '#FFFF00',
    health:
      'Breathing discomfort for people with lung or heart disease, children and older adults.',
  },
  {
    category: 'Poor',
    low: 201,
    high: 300,
    colour: '#FF6500',
    health: 'Breathing discomfort for most people on prolonged exposure.',
  },
  {
    category: 'Very Poor',
    low: 301,
    high: 400,
    colour: '#FF0000',
    health: 'Respiratory illness on prolonged exposure.',
  },
  {
    category: 'Severe',
    low: 401,
    high: 500,
    colour: '#C00000',
    health: 'Affects healthy people; serious impact on people with lung or heart disease.',
  },
];

/**
 * Concentration breakpoints per pollutant, one [low, high] pair per band in
 * AQI_BANDS order. The last band is open-ended; its high value is the CPCB
 * reference point used to cap the index at 500.
 */
export const BREAKPOINTS: Readonly<Record<Pollutant, readonly (readonly [number, number])[]>> = {
  'PM2.5': [
    [0, 30],
    [31, 60],
    [61, 90],
    [91, 120],
    [121, 250],
    [251, 380],
  ],
  PM10: [
    [0, 50],
    [51, 100],
    [101, 250],
    [251, 350],
    [351, 430],
    [431, 510],
  ],
  NO2: [
    [0, 40],
    [41, 80],
    [81, 180],
    [181, 280],
    [281, 400],
    [401, 520],
  ],
  SO2: [
    [0, 40],
    [41, 80],
    [81, 380],
    [381, 800],
    [801, 1600],
    [1601, 2400],
  ],
  CO: [
    [0, 1],
    [1.1, 2],
    [2.1, 10],
    [10.1, 17],
    [17.1, 34],
    [34.1, 51],
  ],
  OZONE: [
    [0, 50],
    [51, 100],
    [101, 168],
    [169, 208],
    [209, 748],
    [749, 1000],
  ],
  NH3: [
    [0, 200],
    [201, 400],
    [401, 800],
    [801, 1200],
    [1201, 1800],
    [1801, 2400],
  ],
};
