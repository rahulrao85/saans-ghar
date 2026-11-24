import { GoogleGenAI, type Content, type FunctionDeclaration } from '@google/genai';

/** A tool call the model asked for. */
export interface ToolCall {
  readonly name: string;
  readonly args: Readonly<Record<string, unknown>>;
}

/** One request to the model. */
export interface GenerateRequest {
  readonly system: string;
  readonly contents: Content[];
  readonly tools?: FunctionDeclaration[];
  /** JSON Schema the reply must follow (structured output). */
  readonly jsonSchema?: Record<string, unknown>;
}

/** The parts of a reply the app uses. */
export interface GenerateResult {
  readonly text: string;
  readonly calls: readonly ToolCall[];
  /** The model's turn, to send back with tool results. */
  readonly content: Content | undefined;
}

/** The one thing the app needs from a language model; swapped for a fake in tests. */
export interface AiModel {
  generate(request: GenerateRequest): Promise<GenerateResult>;
}

/**
 * A healthy free-tier call answers in 1-4 s, but under load Google returns 503
 * or hangs. So each try gets 8 s and a failed try is retried, up to three in all;
 * after that the caller shows the rules answer.
 */
const TRY_TIMEOUT_MS = 8_000;
const TRIES = 3;
const BACKOFF_MS = 400;

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Run `call` with a fresh timeout per try, retrying failures with a short backoff. */
export async function withRetry<T>(call: (signal: AbortSignal) => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await call(AbortSignal.timeout(TRY_TIMEOUT_MS));
    } catch (error) {
      if (attempt >= TRIES) throw error;
      await pause(BACKOFF_MS * attempt);
    }
  }
}
/** Low temperature: the model words facts, it does not invent them. */
const TEMPERATURE = 0.3;
const MAX_OUTPUT_TOKENS = 2048;

/** Gemini through the AI Studio key (free tier; the project has no billing). */
export function geminiModel(apiKey: string, model: string): AiModel {
  const ai = new GoogleGenAI({ apiKey });
  return {
    async generate(request) {
      const response = await withRetry((abortSignal) =>
        ai.models.generateContent({
          model,
          contents: request.contents,
          config: {
            systemInstruction: request.system,
            temperature: TEMPERATURE,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            abortSignal,
            ...(request.tools ? { tools: [{ functionDeclarations: request.tools }] } : {}),
            ...(request.jsonSchema
              ? { responseMimeType: 'application/json', responseJsonSchema: request.jsonSchema }
              : {}),
          },
        }),
      );
      const content = response.candidates?.[0]?.content;
      return {
        // Join text parts ourselves: thought and function-call parts are not the answer.
        text: (content?.parts ?? [])
          .filter((p) => p.thought !== true)
          .map((p) => p.text ?? '')
          .join(''),
        calls: (response.functionCalls ?? []).map((c) => ({
          name: c.name ?? '',
          args: c.args ?? {},
        })),
        content,
      };
    },
  };
}
