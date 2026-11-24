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

/** Free-tier calls are quick; a slow one is treated as a failure and the rules answer. */
const TIMEOUT_MS = 25_000;
/** Low temperature: the model words facts, it does not invent them. */
const TEMPERATURE = 0.3;
const MAX_OUTPUT_TOKENS = 2048;

/** Gemini through the AI Studio key (free tier; the project has no billing). */
export function geminiModel(apiKey: string, model: string): AiModel {
  const ai = new GoogleGenAI({ apiKey });
  return {
    async generate(request) {
      const response = await ai.models.generateContent({
        model,
        contents: request.contents,
        config: {
          systemInstruction: request.system,
          temperature: TEMPERATURE,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          abortSignal: AbortSignal.timeout(TIMEOUT_MS),
          ...(request.tools ? { tools: [{ functionDeclarations: request.tools }] } : {}),
          ...(request.jsonSchema
            ? { responseMimeType: 'application/json', responseJsonSchema: request.jsonSchema }
            : {}),
        },
      });
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
