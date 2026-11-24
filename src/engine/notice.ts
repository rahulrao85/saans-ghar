import { bandFor } from './aqi';
import { GRAP_FROM, type GrapStage } from './data/grap';
import type { AqiCategory } from './data/naqi';
import { hourLabel } from './format';

/** What a school or housing society should do about outdoor activity. */
export type OutdoorCall = 'normal' | 'reduce' | 'move-indoors' | 'cancel';

/** Facts the notice is written from. The model only words them. */
export interface NoticeFacts {
  readonly place: string;
  readonly aqi: number;
  readonly category: AqiCategory;
  readonly call: OutdoorCall;
  /** Only set for Delhi-NCR. */
  readonly grapStage: GrapStage | null;
  /** Clock time such as "9 pm", so the wording never shows a 24-hour index. */
  readonly cleanestTime: string | null;
}

/** Outdoor-activity call per NAQI category, cautious because children are involved. */
const CALLS: Readonly<Record<AqiCategory, OutdoorCall>> = {
  Good: 'normal',
  Satisfactory: 'normal',
  Moderate: 'reduce',
  Poor: 'move-indoors',
  'Very Poor': 'cancel',
  Severe: 'cancel',
};

/** The outdoor-activity call for an AQI value. */
export function outdoorCall(aqi: number): OutdoorCall {
  return CALLS[bandFor(aqi).category];
}

/** GRAP stage that this AQI would trigger in Delhi-NCR (0 = below Stage I). */
export function grapStageFor(aqi: number): GrapStage {
  let stage: GrapStage = 0;
  for (const [from, s] of GRAP_FROM) if (aqi >= from) stage = s;
  return stage;
}

/** Collect the facts for a society or school notice. */
export function noticeFacts(
  place: string,
  aqi: number,
  inDelhiNcr: boolean,
  cleanestHour: number | null,
): NoticeFacts {
  return {
    place,
    aqi,
    category: bandFor(aqi).category,
    call: outdoorCall(aqi),
    grapStage: inDelhiNcr ? grapStageFor(aqi) : null,
    cleanestTime: cleanestHour === null ? null : hourLabel(cleanestHour),
  };
}

const CALL_TEXT: Readonly<Record<OutdoorCall, string>> = {
  normal: 'Outdoor play and PE can go ahead as usual.',
  reduce: 'Keep outdoor play short and gentle; children with asthma should stay in.',
  'move-indoors': 'Please move PE and outdoor play indoors today.',
  cancel: 'Please cancel all outdoor activity today and keep windows shut during smog hours.',
};

/** Plain notice text, used when the AI is unavailable and as its factual base. */
export function fallbackNotice(f: NoticeFacts): string {
  const stage = f.grapStage ? ` (GRAP Stage ${f.grapStage} level)` : '';
  const hour = f.cleanestTime === null ? '' : ` The cleanest time is ${f.cleanestTime}.`;
  return `Air quality in ${f.place}: AQI ${f.aqi}, ${f.category}${stage}. ${CALL_TEXT[f.call]}${hour}`;
}
