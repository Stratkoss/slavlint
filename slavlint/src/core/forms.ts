import { lookupForms } from "./dictionary.js";
import { categoryExamples, pluralCategories } from "./plurals.js";
import { LANG_NAMES, type Lang } from "./types.js";

export interface PluralForms {
  word: string;
  lang: Lang;
  source: "grok" | "dictionary";
  categories: string[];
  forms: Record<string, string>;
  /** Each form after a sample number, e.g. { few: "2 položky", many: "1,5 položky" }. */
  examples: Record<string, string>;
  /** Ready-to-paste i18next keys. */
  i18next: Record<string, string>;
  note?: string;
}

/** Throws unless `forms` has exactly the categories Intl.PluralRules requires for `lang`. */
export function validateForms(forms: unknown, lang: Lang): Record<string, string> {
  const required = pluralCategories(lang);
  if (!forms || typeof forms !== "object" || Array.isArray(forms)) throw new Error("forms must be an object");
  const record = forms as Record<string, unknown>;
  const keys = Object.keys(record);
  const missing = required.filter((c) => !keys.includes(c));
  const extra = keys.filter((k) => !required.includes(k));
  if (missing.length || extra.length) {
    throw new Error(`categories must be exactly ${required.join(", ")} (missing: ${missing.join(", ") || "none"}, extra: ${extra.join(", ") || "none"})`);
  }
  const out: Record<string, string> = {};
  for (const cat of required) {
    const v = record[cat];
    if (typeof v !== "string" || !v.trim() || v.length > 60 || /[\d{}]/.test(v)) {
      throw new Error(`invalid form for "${cat}": ${JSON.stringify(v)}`);
    }
    out[cat] = v.trim();
  }
  return out;
}

function sampleNumber(lang: Lang, category: string): string {
  const rules = new Intl.PluralRules(lang);
  const candidates = [1, 2, 5, 0, 1.5, 2.5, 0.5];
  const n = candidates.find((c) => rules.select(c) === category) ?? 1;
  return new Intl.NumberFormat(lang).format(n);
}

export function defaultKey(word: string): string {
  const slug = word
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
  return `${slug || "item"}Count`;
}

export function buildPluralForms(
  word: string,
  lang: Lang,
  forms: Record<string, string>,
  source: PluralForms["source"],
  key = defaultKey(word),
  note?: string,
): PluralForms {
  const valid = validateForms(forms, lang);
  const categories = pluralCategories(lang);
  const examples: Record<string, string> = {};
  const i18next: Record<string, string> = {};
  for (const cat of categories) {
    examples[cat] = `${sampleNumber(lang, cat)} ${valid[cat]}`;
    i18next[`${key}_${cat}`] = `{{count}} ${valid[cat]}`;
  }
  return { word, lang, source, categories, forms: valid, examples, i18next, ...(note ? { note } : {}) };
}

/** Plural forms from the built-in dictionary, or null if the word isn't in it. */
export function dictionaryForms(word: string, lang: Lang, key?: string, note?: string): PluralForms | null {
  const forms = lookupForms(word, lang);
  return forms ? buildPluralForms(word, lang, forms, "dictionary", key, note) : null;
}

/** Prompt describing each category with example counts, so the model can't guess the categories. */
export function formsPrompt(word: string, lang: Lang): string {
  const examples = categoryExamples(lang);
  const cats = pluralCategories(lang)
    .map((c) => `- "${c}": count ${examples[c]}`)
    .join("\n");
  return [
    `Give the ${LANG_NAMES[lang]} forms of the noun "${word}" exactly as it is written after a number in UI text (e.g. "{{count}} <form>").`,
    `If the word is not ${LANG_NAMES[lang]}, translate it to ${LANG_NAMES[lang]} first.`,
    `Use these plural categories from Intl.PluralRules("${lang}"):`,
    cats,
    `Reply with JSON only: {"forms": {${pluralCategories(lang).map((c) => `"${c}": "..."`).join(", ")}}}. Only the noun, no number.`,
  ].join("\n");
}
