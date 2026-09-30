import { buildPluralForms, dictionaryForms, formsPrompt, type PluralForms } from "./core/forms.js";
import type { Lang } from "./core/types.js";

const XAI_URL = "https://api.x.ai/v1/chat/completions";
const DEFAULT_MODEL = "grok-4.20-0309-non-reasoning";

async function askGrok(word: string, lang: Lang): Promise<unknown> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY is not set");

  const res = await fetch(XAI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(20_000),
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
  if (!res.ok) throw new Error(`xAI API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("xAI API returned no content");
  const parsed = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  return parsed.forms ?? parsed;
}

/**
 * Word forms from Grok, validated against Intl.PluralRules. Falls back to the
 * built-in dictionary when the key is missing, the call fails, or Grok
 * returns the wrong categories.
 */
export async function pluralForms(word: string, lang: Lang, key?: string): Promise<PluralForms> {
  let reason: string;
  try {
    return buildPluralForms(word, lang, (await askGrok(word, lang)) as Record<string, string>, "grok", key);
  } catch (err) {
    reason = (err as Error).message;
  }
  const fallback = dictionaryForms(word, lang, key, `Grok unavailable (${reason}); used the built-in dictionary.`);
  if (fallback) return fallback;
  throw new Error(`Grok unavailable (${reason}) and "${word}" is not in the built-in dictionary.`);
}
