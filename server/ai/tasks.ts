import type { Content } from '@google/genai';
import { rulesAnswer } from '../../src/engine/answer';
import { rulesExplain, totalSaved } from '../../src/engine/explain';
import { hourLabel } from '../../src/engine/format';
import { fallbackNotice, type NoticeFacts } from '../../src/engine/notice';
import {
  displayReadingSchema,
  type AiText,
  type DisplayReading,
  type Language,
  type PlanFacts,
} from '../../src/schemas/facts';
import { log } from '../log';
import { allowedNumbers, isGrounded } from './guard';
import type { AiModel } from './model';
import { ASK_SYSTEM, READ_SYSTEM, explainSystem, noticeSystem } from './prompts';
import { TOOL_DECLARATIONS, runTool } from './tools';

/** A tool loop that has not answered after this many rounds is cut off. */
const MAX_TOOL_ROUNDS = 4;

/** Facts with clock times added, so the model never has to convert "hour 14". */
function withTimes(facts: PlanFacts): unknown {
  return {
    ...facts,
    items: facts.items.map((i) => ({
      ...i,
      usualTime: hourLabel(i.usualHour),
      bestTime: hourLabel(i.bestHour),
    })),
  };
}

function userText(text: string): Content[] {
  return [{ role: 'user', parts: [{ text }] }];
}

/** Keep the AI text only if every number in it came from code; otherwise use the rules text. */
function grounded(text: string, allowed: Set<number>, fallback: string): AiText {
  const clean = text.trim();
  if (clean !== '' && isGrounded(clean, allowed)) return { text: clean, source: 'gemini' };
  if (clean !== '') log('warn', 'ai reply dropped by number guard');
  return { text: fallback, source: 'rules' };
}

/**
 * Run a model call. No model (no key), no quota, a timeout or a bad reply all
 * fall back to the rules text, so the app always answers.
 */
async function attempt(
  model: AiModel | null,
  fallback: string,
  run: (m: AiModel) => Promise<AiText>,
): Promise<AiText> {
  if (model === null) return { text: fallback, source: 'rules' };
  try {
    return await run(model);
  } catch (error) {
    log('warn', 'ai call failed', { message: error instanceof Error ? error.message : 'unknown' });
    return { text: fallback, source: 'rules' };
  }
}

/** Explain the plan in the family's language. */
export function explainPlan(
  model: AiModel | null,
  facts: PlanFacts,
  language: Language,
): Promise<AiText> {
  const fallback = rulesExplain(facts);
  return attempt(model, fallback, async (m) => {
    const prompt = `Facts (JSON): ${JSON.stringify(withTimes(facts))}`;
    const reply = await m.generate({
      system: explainSystem(language),
      contents: userText(prompt),
    });
    return grounded(reply.text, allowedNumbers(facts, totalSaved(facts)), fallback);
  });
}

/** Word a society notice around a decision code already made. */
export function writeNotice(
  model: AiModel | null,
  facts: NoticeFacts,
  language: Language,
): Promise<AiText> {
  const fallback = fallbackNotice(facts);
  return attempt(model, fallback, async (m) => {
    const prompt = `Facts (JSON): ${JSON.stringify(facts)}`;
    const reply = await m.generate({
      system: noticeSystem(language),
      contents: userText(prompt),
    });
    return grounded(reply.text, allowedNumbers(facts), fallback);
  });
}

/** Answer a question with function calling over our own tools. */
export function askPlan(
  model: AiModel | null,
  question: string,
  facts: PlanFacts,
): Promise<AiText> {
  const fallback = rulesAnswer(question, facts);
  return attempt(model, fallback, async (m) => {
    const contents = userText(question);
    const results: unknown[] = [facts];
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const reply = await m.generate({
        system: ASK_SYSTEM,
        contents,
        tools: TOOL_DECLARATIONS,
      });
      if (reply.calls.length === 0)
        return grounded(reply.text, allowedNumbers(...results), fallback);
      if (reply.content !== undefined) contents.push(reply.content);
      const parts = reply.calls.map((call) => {
        const response = runTool(call, facts);
        results.push(response);
        return { functionResponse: { name: call.name, response } };
      });
      contents.push({ role: 'user', parts });
    }
    return { text: fallback, source: 'rules' };
  });
}

const READING_JSON_SCHEMA = {
  type: 'object',
  properties: {
    found: { type: 'boolean' },
    pm25: { type: ['number', 'null'] },
    device: { type: 'string', enum: ['monitor', 'purifier', 'other'] },
  },
  required: ['found', 'pm25', 'device'],
};

/** Read the PM2.5 number off a photo; the user confirms it before it is used. */
export async function readDisplay(
  model: AiModel,
  base64: string,
  mimeType: string,
): Promise<DisplayReading> {
  const reply = await model.generate({
    system: READ_SYSTEM,
    contents: [
      {
        role: 'user',
        parts: [{ inlineData: { data: base64, mimeType } }, { text: 'Read the display.' }],
      },
    ],
    jsonSchema: READING_JSON_SCHEMA,
  });
  const parsed = displayReadingSchema.parse(JSON.parse(reply.text));
  return parsed.found ? parsed : { ...parsed, pm25: null };
}
