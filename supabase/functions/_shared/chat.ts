import type { Database } from "./database.ts";
import { env, fetchJSON, HttpError, object, text } from "./http.ts";
import { spend } from "./quota.ts";
export const MODELS = [
  "meta-llama/llama-3.1-8b-instruct",
  "openai/gpt-oss-20b",
] as const;
export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}
export function chatInput(input: Record<string, unknown>) {
  if (
    !Array.isArray(input.messages) || input.messages.length < 1 ||
    input.messages.length > 16
  ) throw new HttpError(400, "INVALID_MESSAGES");
  let length = 0;
  const messages = input.messages.map((value) => {
    const message = object(value);
    const role = message.role;
    if (role !== "system" && role !== "user" && role !== "assistant") {
      throw new HttpError(400, "INVALID_ROLE");
    }
    const content = text(
      message.content,
      role === "system" ? 12000 : 2000,
      "MESSAGE",
    );
    length += content.length;
    return { role, content } as Message;
  });
  if (length > 20000 || messages.at(-1)?.role !== "user") {
    throw new HttpError(400, "INVALID_CONTEXT");
  }
  const options = input.options === undefined ? {} : object(input.options);
  if (
    options.model !== undefined &&
    !MODELS.includes(options.model as typeof MODELS[number])
  ) throw new HttpError(400, "MODEL_NOT_ALLOWED");
  const maxTokens = options.maxTokens === undefined ? 300 : options.maxTokens;
  const temperature = options.temperature === undefined
    ? 0.7
    : options.temperature;
  if (
    !Number.isInteger(maxTokens) || Number(maxTokens) < 1 ||
    Number(maxTokens) > 500 || typeof temperature !== "number" ||
    !Number.isFinite(temperature) || temperature < 0 || temperature > 1
  ) throw new HttpError(400, "INVALID_OPTIONS");
  return { messages, maxTokens: Math.min(Number(maxTokens), 300), temperature };
}
interface Answer {
  text: string;
  limited: boolean;
}
export type ChatProvider = (
  provider: "openrouter" | "groq",
  messages: Message[],
  maxTokens: number,
  temperature: number,
) => Promise<Answer>;
export function provider(db: Database): ChatProvider {
  return async (name, messages, maxTokens, temperature) => {
    const key = env(
      name === "openrouter" ? "OPENROUTER_API_KEY" : "GROQ_API_KEY",
    );
    await spend(db, name);
    const data = await fetchJSON(
      name === "openrouter"
        ? "https://openrouter.ai/api/v1/chat/completions"
        : "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://flexbreak.app",
          "X-Title": "FlexBreak AI Wellness",
        },
        body: JSON.stringify({
          model: name === "openrouter" ? MODELS[0] : MODELS[1],
          messages,
          max_tokens: maxTokens,
          temperature,
          ...(name === "groq"
            ? { reasoning_effort: "low", include_reasoning: false }
            : {}),
        }),
      },
    );
    const choices = data.choices;
    const first = Array.isArray(choices) ? object(choices[0]) : {};
    const content = first.message && object(first.message).content;
    if (
      typeof content !== "string" || !content.trim() || content.length > 16000
    ) throw new HttpError(502, "INVALID_AI_RESPONSE");
    return { text: content, limited: first.finish_reason === "length" };
  };
}
export async function chat(
  input: ReturnType<typeof chatInput>,
  call: ChatProvider,
): Promise<string> {
  let selected: "openrouter" | "groq" = "openrouter";
  let answer: Answer;
  try {
    answer = await call(
      selected,
      input.messages,
      input.maxTokens,
      input.temperature,
    );
  } catch {
    selected = "groq";
    answer = await call(
      selected,
      input.messages,
      input.maxTokens,
      input.temperature,
    );
  }
  if (!answer.limited) return answer.text;
  const continuation: Message[] = [...input.messages, {
    role: "assistant",
    content: answer.text,
  }, {
    role: "user",
    content:
      "Continue exactly where you left off. Do not repeat any content. Finish cleanly with proper punctuation.",
  }];
  let next: Answer;
  try {
    next = await call(
      selected,
      continuation,
      Math.min(200, input.maxTokens),
      input.temperature,
    );
  } catch {
    try {
      next = await call(
        selected === "groq" ? "openrouter" : "groq",
        continuation,
        Math.min(200, input.maxTokens),
        input.temperature,
      );
    } catch {
      return answer.text;
    }
  }
  return `${answer.text} ${next.text}`.trim();
}
