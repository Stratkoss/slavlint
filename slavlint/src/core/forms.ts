import { lookupForms } from "./dictionary.js";
import { categorySamples, decimalCopies, integerCategories, pluralCategories } from "./plurals.js";
import { LANG_NAMES, type Finding, type Lang } from "./types.js";

/** Which grammatical form each Intl.PluralRules category takes after a number. */
export const GRAMMAR_HINTS: Record<Lang, Record<string, string>> = {
  cs: {
    one: "nominative singular (1 položka)",
    few: "nominative plural (2 položky)",
    many: "genitive singular, used after decimals (1,5 položky)",
    other: "genitive plural, also for 0 (5 položek)",
  },
  pl: {
    one: "nominative singular (1 plik)",
    few: "nominative plural, also 22–24, 32–34, … (2 pliki)",
    many: "genitive plural, also 0, 11–14, 25–31, … (5 plików)",
    other: "genitive singular, used after decimals (1,5 pliku)",
  },
};

export const VERIFY_SCOPE =
  "Verified: categories against Intl.PluralRules, empty forms, the decimal-copy pattern, and the built-in dictionary of 15 common UI words. Not verified: full grammar of words outside the dictionary.";

export interface CategoryGuide {
  category: string;
  suffix: string;
  counts: string;
  hint: string;
}

export interface PluralGuide {
  word: string;
  lang: Lang;
  categories: CategoryGuide[];
  /** Correct forms when the word is in the built-in dictionary. */
  knownForms?: Record<string, string>;
  /** Unverified suggestion from Grok, only when XAI_API_KEY is set. */
  suggestion?: { source: "grok"; forms: Record<string, string> };
  template: Record<string, string>;
  instruction: string;
}

export function pluralGuide(word: string, lang: Lang): PluralGuide {
  const number = new Intl.NumberFormat(lang);
  const samples = categorySamples(lang);
  const categories = pluralCategories(lang).map((category) => ({
    category,
    suffix: `_${category}`,
    counts: samples[category].map((n) => number.format(n)).join(", "),
    hint: GRAMMAR_HINTS[lang][category] ?? "",
  }));
  const knownForms = lookupForms(word, lang) ?? undefined;
  const template = Object.fromEntries(pluralCategories(lang).map((c) => [c, ""]));
  const instruction = knownForms
    ? `"${word}" is in the built-in dictionary; knownForms are correct. Call verify_plural_forms with them (and your key) to get the i18next key set.`
    : `Fill in the ${LANG_NAMES[lang]} form of "${word}" for each category (just the noun, or the full text with {{count}}), following the hints and example counts. Then call verify_plural_forms(lang, forms, key) and fix any errors before writing the locale file.`;
  return { word, lang, categories, ...(knownForms ? { knownForms } : {}), template, instruction };
}

export interface VerifyResult {
  ok: boolean;
  lang: Lang;
  key: string;
  errors: Finding[];
  warnings: Finding[];
  /** Built-in dictionary word the forms were compared with, if any. */
  dictionaryWord: string | null;
  /** Ready-to-paste i18next keys; only when ok. */
  i18next?: Record<string, string>;
  scope: string;
}

const strip = (s: string) => s.replace(/\{\{[^}]*\}\}/g, "").trim().toLowerCase();

function findDictionaryEntry(lang: Lang, forms: Record<string, string>, word?: string) {
  const candidates = [word, forms.one].filter(Boolean).map((w) => strip(w!));
  for (const c of candidates) {
    const known = lookupForms(c, lang);
    if (known) return { word: known.one, forms: known };
  }
  return null;
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

/**
 * Verifies agent-written plural forms. Errors: missing/empty/unknown categories.
 * Warnings: decimal slot copied from the 5+ form, mismatches with the dictionary.
 */
export function verifyPluralForms(lang: Lang, input: Record<string, unknown>, key?: string, word?: string): VerifyResult {
  const langName = LANG_NAMES[lang];
  const required = pluralCategories(lang);
  const integers = integerCategories(lang);
  const errors: Finding[] = [];
  const warnings: Finding[] = [];
  const forms: Record<string, string> = {};
  for (const [cat, v] of Object.entries(input)) if (typeof v === "string") forms[cat] = v.trim();

  const baseKey = key || defaultKey(word || strip(forms.one ?? "") || "item");
  const finding = (severity: Finding["severity"], rule: string, cat: string, message: string, explanation: string): Finding => ({
    rule, severity, key: `${baseKey}_${cat}`, message, explanation,
  });

  for (const cat of required) {
    if (!forms[cat]) {
      const decimal = integers.has(cat) ? "" : " It is used for decimal counts like 1,5.";
      errors.push(finding("error", "plural-missing", cat, `Missing or empty form for "${cat}"`, `${langName} requires ${required.join(", ")}.${decimal} Without it i18next falls back to the fallback language (usually English). Expected: ${GRAMMAR_HINTS[lang][cat]}.`));
    }
  }
  for (const cat of Object.keys(input)) {
    if (!required.includes(cat)) {
      errors.push(finding("error", "plural-unused", cat, `"${cat}" is not a ${langName} plural category`, `${langName} uses only ${required.join(", ")} (Intl.PluralRules); i18next would never select "${cat}".`));
    }
  }

  for (const { category, sameAs } of decimalCopies(lang, forms)) {
    warnings.push(finding("warning", "plural-decimal-copy", category, `"${category}" is identical to "${sameAs}" ("${forms[category]}")`, `"${category}" is only used after decimals and normally takes the ${GRAMMAR_HINTS[lang][category]}; "${sameAs}" takes the ${GRAMMAR_HINTS[lang][sameAs]}. Identical forms usually mean a copy-paste. Ignore only if they genuinely coincide for this word.`));
  }

  const known = findDictionaryEntry(lang, forms, word);
  if (known) {
    for (const cat of required) {
      if (forms[cat] && strip(forms[cat]) !== known.forms[cat]) {
        warnings.push(finding("warning", "plural-dictionary-mismatch", cat, `"${strip(forms[cat])}" differs from the known form "${known.forms[cat]}"`, `The built-in dictionary has "${known.word}" → ${cat}: "${known.forms[cat]}" (${GRAMMAR_HINTS[lang][cat]}).`));
      }
    }
  }

  const ok = errors.length === 0;
  const result: VerifyResult = { ok, lang, key: baseKey, errors, warnings, dictionaryWord: known?.word ?? null, scope: VERIFY_SCOPE };
  if (ok) {
    result.i18next = Object.fromEntries(
      required.map((cat) => [`${baseKey}_${cat}`, forms[cat].includes("{{count") ? forms[cat] : `{{count}} ${forms[cat]}`]),
    );
  }
  return result;
}

/** Throws unless `forms` has exactly the required categories with non-empty strings. */
export function assertValidForms(forms: unknown, lang: Lang): Record<string, string> {
  if (!forms || typeof forms !== "object" || Array.isArray(forms)) throw new Error("forms must be an object");
  const result = verifyPluralForms(lang, forms as Record<string, unknown>);
  if (!result.ok) throw new Error(result.errors.map((e) => e.message).join("; "));
  return Object.fromEntries(pluralCategories(lang).map((c) => [c, strip((forms as Record<string, string>)[c])]));
}

/** Prompt describing each category with example counts, so the model can't guess the categories. */
export function formsPrompt(word: string, lang: Lang): string {
  const guide = pluralGuide(word, lang);
  const cats = guide.categories.map((c) => `- "${c.category}": count ${c.counts}; ${c.hint}`).join("\n");
  return [
    `Give the ${LANG_NAMES[lang]} forms of the noun "${word}" exactly as written after a number in UI text.`,
    `If the word is not ${LANG_NAMES[lang]}, translate it to ${LANG_NAMES[lang]} first.`,
    `Plural categories from Intl.PluralRules("${lang}"):`,
    cats,
    `Reply with JSON only: {"forms": {${pluralCategories(lang).map((c) => `"${c}": "..."`).join(", ")}}}. Only the noun, no number.`,
  ].join("\n");
}
