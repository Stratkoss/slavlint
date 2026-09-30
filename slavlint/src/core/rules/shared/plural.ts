import { categoryExamples, decimalCopies, integerCategories, pluralCategories, type PluralType } from "../../plurals.js";
import { LANG_NAMES, type Entry, type Finding, type Rule } from "../../types.js";

const SUFFIX_RE = /^(.+?)(_ordinal)?_(zero|one|two|few|many|other)$/;
const COUNT_RE = /\{\{\s*count\s*(?:,[^}]*)?\}\}/;

interface PluralGroup {
  base: string;
  type: PluralType;
  variants: Map<string, Entry>;
}

/**
 * Checks that every i18next plural key has all the categories the language
 * needs (Intl.PluralRules), and flags {{count}} texts with no plural variants.
 */
export const pluralRule: Rule = ({ lang, entries }) => {
  const findings: Finding[] = [];
  const langName = LANG_NAMES[lang];
  const groups = new Map<string, PluralGroup>();
  const plain = new Map<string, Entry>();

  for (const entry of entries) {
    const m = entry.key.match(SUFFIX_RE);
    if (!m) {
      plain.set(entry.key, entry);
      continue;
    }
    const [, base, ordinal, category] = m;
    const type: PluralType = ordinal ? "ordinal" : "cardinal";
    const id = `${base}|${type}`;
    let group = groups.get(id);
    if (!group) {
      group = { base, type, variants: new Map() };
      groups.set(id, group);
    }
    group.variants.set(category, entry);
  }

  for (const group of groups.values()) {
    const required = pluralCategories(lang, group.type);
    const examples = categoryExamples(lang, group.type);
    const suffix = (cat: string) => (group.type === "ordinal" ? `_ordinal_${cat}` : `_${cat}`);
    const firstLine = Math.min(...[...group.variants.values()].map((e) => e.line ?? Infinity));
    const line = Number.isFinite(firstLine) ? firstLine : undefined;

    const integers = integerCategories(lang, group.type);
    const allMissing = required.filter((cat) => !group.variants.has(cat));
    const missing = allMissing.filter((cat) => integers.has(cat));
    const decimalOnly = allMissing.filter((cat) => !integers.has(cat));

    if (decimalOnly.length > 0) {
      const forms = decimalOnly.map(suffix).join(", ");
      findings.push({
        rule: "plural-missing-decimal",
        severity: "warning",
        key: group.base,
        line,
        message: `Missing plural form${decimalOnly.length > 1 ? "s" : ""} ${forms}, used only for decimals like 1.5`,
        explanation: `${langName} selects ${forms} only for fractional counts. For whole-number counts (items, files) nothing breaks; if the count can be a decimal (hours, kilograms), ${langName} users see the fallback language (usually English).`,
      });
    }

    const values = Object.fromEntries([...group.variants].map(([cat, e]) => [cat, e.value]));
    for (const { category: cat, sameAs: fivePlus } of decimalCopies(lang, values, group.type)) {
      const entry = group.variants.get(cat)!;
      findings.push({
        rule: "plural-decimal-copy",
        severity: "warning",
        key: entry.key,
        line: entry.line,
        message: `${suffix(cat)} is identical to ${suffix(fivePlus)} ("${entry.value}")`,
        explanation: `${langName} uses ${suffix(cat)} only for decimals like 1.5, which normally take a different form (genitive singular) than ${suffix(fivePlus)} for 5+ (genitive plural). Identical texts usually mean the 5+ form was copied into the decimal slot. Ignore if the two forms genuinely coincide for this word.`,
      });
    }

    if (missing.length > 0) {
      const forms = missing.map((cat) => `${suffix(cat)} (${examples[cat]})`).join(", ");
      const counts = missing.map((cat) => examples[cat]).join(" or ");
      const baseFallback = plain.has(group.base)
        ? `i18next falls back to the plain "${group.base}" string, which has the wrong grammatical form for these numbers.`
        : `i18next can't find these keys in ${langName}, so it falls back to the fallback language (usually English): ${langName} users see English text when the count is ${counts}.`;
      findings.push({
        rule: "plural-missing",
        severity: "error",
        key: group.base,
        line,
        message: `Missing plural form${missing.length > 1 ? "s" : ""}: ${forms}`,
        explanation: `${langName} has ${required.length} plural categories (${required.map(suffix).join(", ")}). ${baseFallback}`,
      });
    }

    for (const [cat, entry] of group.variants) {
      if (required.includes(cat) || cat === "zero") continue;
      findings.push({
        rule: "plural-unused",
        severity: "warning",
        key: entry.key,
        line: entry.line,
        message: `Plural form ${suffix(cat)} does not exist in ${langName}`,
        explanation: `i18next never selects "${cat}" for ${langName} (categories: ${required.join(", ")}), so this text is dead. It was probably copied from another language.`,
      });
    }
  }

  for (const entry of plain.values()) {
    if (!COUNT_RE.test(entry.value)) continue;
    if (groups.has(`${entry.key}|cardinal`)) continue;
    findings.push({
      rule: "plural-no-variants",
      severity: "warning",
      key: entry.key,
      line: entry.line,
      message: `Uses {{count}} but has no plural variants`,
      explanation: `The same text is shown for every number. In ${langName} nouns change with the count (1 / 2–4 / 5+), so this is usually wrong — unless the word doesn't inflect, like the abbreviation "${lang === "cs" ? "ks" : "szt."}".`,
    });
  }

  return findings;
};
