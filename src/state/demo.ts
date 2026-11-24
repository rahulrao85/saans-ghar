import type { Household, MemberData, RoutineData } from './household';

/** A routine the family can shift by up to `flex` hours either way. */
function routine(
  id: string,
  label: string,
  usualHour: number,
  rest: Omit<RoutineData, 'id' | 'label' | 'usualHour' | 'earliestHour' | 'latestHour'> & {
    flex: number;
  },
): RoutineData {
  const { flex, ...fields } = rest;
  return {
    id,
    label,
    usualHour,
    earliestHour: Math.max(0, usualHour - flex),
    latestHour: Math.min(23, usualHour + flex),
    ...fields,
  };
}

const mumbaiMembers: MemberData[] = [
  {
    id: 'aai',
    name: 'Aai',
    group: 'elder',
    sensitive: true,
    routines: [
      routine('aai-walk', 'Evening walk', 18, {
        activity: 'moderate',
        minutes: 45,
        required: false,
        flex: 4,
        mode: 'walk',
      }),
    ],
  },
  {
    id: 'sameer',
    name: 'Sameer',
    group: 'adult',
    sensitive: false,
    routines: [
      routine('sameer-commute', 'Office commute', 9, {
        activity: 'light',
        minutes: 40,
        required: true,
        flex: 1,
        mode: 'two-wheeler',
      }),
    ],
  },
  {
    id: 'tara',
    name: 'Tara',
    group: 'child',
    sensitive: false,
    routines: [
      routine('tara-school', 'School run', 7, {
        activity: 'moderate',
        minutes: 15,
        required: true,
        flex: 0,
        mode: 'walk',
      }),
      routine('tara-play', 'Play in the society', 17, {
        activity: 'vigorous',
        minutes: 60,
        required: false,
        flex: 2,
      }),
    ],
  },
];

const delhiMembers: MemberData[] = [
  {
    id: 'dadaji',
    name: 'Dadaji',
    group: 'elder',
    sensitive: true,
    routines: [
      routine('dadaji-walk', 'Morning walk in the park', 6, {
        activity: 'moderate',
        minutes: 60,
        required: false,
        flex: 6,
        mode: 'walk',
      }),
    ],
  },
  {
    id: 'priya',
    name: 'Priya',
    group: 'adult',
    sensitive: true,
    routines: [
      routine('priya-commute', 'Metro to office', 9, {
        activity: 'light',
        minutes: 50,
        required: true,
        flex: 1,
        mode: 'metro',
      }),
    ],
  },
  {
    id: 'kabir',
    name: 'Kabir',
    group: 'child',
    sensitive: false,
    routines: [
      routine('kabir-cricket', 'Cricket after school', 16, {
        activity: 'vigorous',
        minutes: 90,
        required: false,
        flex: 2,
      }),
    ],
  },
];

/** One-tap households for the demo and for evaluators (see SAMPLE_INPUTS.md). */
export const DEMOS: readonly { id: string; title: string; household: Household }[] = [
  {
    id: 'mumbai',
    title: 'Mumbai family',
    household: {
      place: { label: 'Chembur, Mumbai', lat: 19.0522, lon: 72.9005 },
      members: mumbaiMembers,
    },
  },
  {
    id: 'delhi',
    title: 'Delhi family',
    household: {
      place: { label: 'Karol Bagh, New Delhi', lat: 28.6519, lon: 77.1909 },
      members: delhiMembers,
    },
  },
];
