import type { Lang } from "./types.js";

export type PluralType = "cardinal" | "ordinal";

export const I18NEXT_SUFFIXES = ["zero", "one", "two", "few", "many", "other"] as const;

/** Plural categories from Intl.PluralRules, in i18next order (one, few, many, other). */
export function pluralCategories(lang: Lang, type: PluralType = "cardinal"): string[] {
  const order: readonly string[] = I18NEXT_SUFFIXES;
  return [...new Intl.PluralRules(lang, { type }).resolvedOptions().pluralCategories].sort(
    (a, b) => order.indexOf(a) - order.indexOf(b),
  );
}

/** Categories reachable by some integer 0–1000. The rest are used only for decimals (e.g. Czech "many"). */
export function integerCategories(lang: Lang, type: PluralType = "cardinal"): Set<string> {
  const rules = new Intl.PluralRules(lang, { type });
  const found = new Set<string>();
  for (let n = 0; n <= 1000; n++) found.add(rules.select(n));
  return found;
}

/**
 * Decimal-only categories whose text equals the 5+ category's text
 * (cs _many = _other, pl _other = _many): usually a copy-paste.
 */
export function decimalCopies(
  lang: Lang,
  values: Record<string, string | undefined>,
  type: PluralType = "cardinal",
): Array<{ category: string; sameAs: string }> {
  const integers = integerCategories(lang, type);
  const fivePlus = new Intl.PluralRules(lang, { type }).select(5);
  const five = values[fivePlus]?.trim();
  if (!five) return [];
  return pluralCategories(lang, type)
    .filter((cat) => !integers.has(cat) && values[cat]?.trim() === five)
    .map((category) => ({ category, sameAs: fivePlus }));
}

/** Up to three representative counts per category, e.g. cs other -> [0, 5, 10], cs many -> [1.5]. */
export function categorySamples(lang: Lang): Record<string, number[]> {
  const rules = new Intl.PluralRules(lang);
  const ints = [0, 1, 2, 3, 4, 5, 10, 11, 12, 21, 22, 25, 100, 101, 102];
  const decimals = [1.5, 2.5, 0.5];
  const out: Record<string, number[]> = {};
  for (const cat of pluralCategories(lang)) {
    const hits = ints.filter((n) => rules.select(n) === cat).slice(0, 3);
    out[cat] = hits.length ? hits : decimals.filter((n) => rules.select(n) === cat).slice(0, 1);
  }
  return out;
}

/**
 * Human-readable sample counts for each plural category, computed from
 * Intl.PluralRules, e.g. Czech "few" -> "2, 3, 4", Czech "many" -> "decimals like 1.5".
 */
export function categoryExamples(lang: Lang, type: PluralType = "cardinal"): Record<string, string> {
  const rules = new Intl.PluralRules(lang, { type });
  const ints: Record<string, number[]> = {};
  const decimals: Record<string, number[]> = {};

  for (let n = 0; n <= 200; n++) (ints[rules.select(n)] ??= []).push(n);
  for (const n of [1.5, 2.5, 5.5, 0.5]) (decimals[rules.select(n)] ??= []).push(n);

  const out: Record<string, string> = {};
  for (const cat of pluralCategories(lang, type)) {
    const i = ints[cat] ?? [];
    if (i.length > 0) {
      out[cat] = i.slice(0, 4).join(", ") + (i.length > 4 ? ", …" : "");
    } else if (decimals[cat]?.length) {
      out[cat] = `a decimal like ${decimals[cat][0]}`;
    } else {
      out[cat] = "rare numbers";
    }
  }
  return out;
}
