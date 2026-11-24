import { Type, type FunctionDeclaration } from '@google/genai';
import { z } from 'zod';
import { inhaledDose } from '../../src/engine/dose';
import { hourLabel } from '../../src/engine/format';
import type { PlanFacts } from '../../src/schemas/facts';
import type { ToolCall } from './model';

/** Tools the model can call. Each one runs our own code over the plan facts. */
export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  { name: 'air_now', description: 'Current AQI, PM2.5, category, source and station.' },
  {
    name: 'forecast_window',
    description:
      'Hourly PM2.5 forecast between two hours (hours since today midnight, 24-47 = tomorrow).',
    parameters: {
      type: Type.OBJECT,
      properties: { from_hour: { type: Type.INTEGER }, to_hour: { type: Type.INTEGER } },
      required: ['from_hour', 'to_hour'],
    },
  },
  {
    name: 'member_plan',
    description: "One family member's plan items: verdict, usual and best hour, index, µg saved.",
    parameters: {
      type: Type.OBJECT,
      properties: { name: { type: Type.STRING } },
      required: ['name'],
    },
  },
  {
    name: 'inhaled_dose',
    description:
      'Micrograms of PM2.5 breathed in for a PM2.5 level, age group, activity and minutes.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        pm25: { type: Type.NUMBER },
        age_group: { type: Type.STRING, enum: ['child', 'adult', 'elder'] },
        activity: { type: Type.STRING, enum: ['rest', 'light', 'moderate', 'vigorous'] },
        minutes: { type: Type.NUMBER },
      },
      required: ['pm25', 'age_group', 'activity', 'minutes'],
    },
  },
];

const MAX_MINUTES = 1440;
const windowArgs = z.object({ from_hour: z.number(), to_hour: z.number() });
const memberArgs = z.object({ name: z.string() });
const doseArgs = z.object({
  pm25: z.number().min(0),
  age_group: z.enum(['child', 'adult', 'elder']),
  activity: z.enum(['rest', 'light', 'moderate', 'vigorous']),
  minutes: z.number().min(0).max(MAX_MINUTES),
});

type Runner = (args: unknown, facts: PlanFacts) => Record<string, unknown>;

const RUNNERS: Readonly<Record<string, Runner>> = {
  air_now: (_args, f) => ({
    place: f.place,
    aqi: f.aqi,
    category: f.category,
    pm25: f.pm25,
    source: f.source,
    station: f.station,
    updated: f.updated,
  }),
  forecast_window: (args, f) => {
    const { from_hour, to_hour } = windowArgs.parse(args);
    return { hours: f.forecast.filter((h) => h.hour >= from_hour && h.hour <= to_hour) };
  },
  member_plan: (args, f) => {
    const name = memberArgs.parse(args).name.toLowerCase();
    const items = f.items.filter((i) => i.member.toLowerCase() === name);
    return {
      items: items.map((i) => ({
        ...i,
        usualTime: hourLabel(i.usualHour),
        bestTime: hourLabel(i.bestHour),
      })),
    };
  },
  inhaled_dose: (args) => {
    const a = doseArgs.parse(args);
    return { micrograms: inhaledDose(a.pm25, a.age_group, a.activity, a.minutes) };
  },
};

/** Run one tool call; bad arguments or unknown tools come back as an error the model can read. */
export function runTool(call: ToolCall, facts: PlanFacts): Record<string, unknown> {
  const runner = RUNNERS[call.name];
  if (runner === undefined) return { error: `Unknown tool ${call.name}` };
  try {
    return runner(call.args, facts);
  } catch {
    return { error: 'Invalid arguments' };
  }
}
