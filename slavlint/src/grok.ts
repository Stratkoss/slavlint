import { assertValidForms, formsPrompt } from "./core/forms.js";
import type { Lang } from "./core/types.js";

const XAI_URL = "https://api.x.ai/v1/chat/completions";
const DEFAULT_MODEL = "grok-4.20-0309-non-reasoning";

/**
 * Optional suggestion from Grok, only when XAI_API_KEY is in the environment.
 * Returns null on any failure; the agent-writes, slavlint-verifies flow never depends on it.
 */
export async function grokSuggestion(word: string, lang: Lang): Promise<Record<string, string> | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(XAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        model: process.env.XAI_MODEL || DEFAULT_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are an expert in Czech and Polish morphology. Reply with JSON only." },
          { role: "user", content: formsPrompt(word, lang) },
        ],
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = body.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    return assertValidForms(parsed.forms ?? parsed, lang);
  } catch {
    return null;
  }
}
