import { NBSP, regexIssues } from "../../text.js";
import type { TextRule } from "../../types.js";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** One-letter words that must not end a line: "V košíku" -> "V␣košíku". */
export function oneLetterWordRule(letters: string, explanation: string): TextRule {
  const re = new RegExp(`(?<=(?:^|[\\s(„“"‚'«])([${letters}])) (?=\\S)`, "giu");
  return (value) =>
    regexIssues(value, re, (m) => ({
      rule: "typo-nbsp-one-letter",
      message: `Use a non-breaking space after the one-letter word "${m[1]}"`,
      explanation,
      replacement: NBSP,
    }));
}

/** Number or {{placeholder}} followed by a unit: "250 ml", "{{count}} ks". */
export function unitRule(units: string[], explanation: string): TextRule {
  const alt = [...units].sort((a, b) => b.length - a.length).map(escape).join("|");
  const re = new RegExp(`(?<=\\d|\\}\\}) (?=(${alt})(?![\\p{L}\\d]))`, "gu");
  return (value) =>
    regexIssues(value, re, (m) => {
      const afterPlaceholder = value[m.index! - 1] === "}";
      return {
        rule: "typo-nbsp-unit",
        message: afterPlaceholder
          ? `Use a non-breaking space between the placeholder and the unit "${m[1]}"`
          : `Use a non-breaking space between the number and the unit "${m[1]}"`,
        explanation,
        replacement: NBSP,
      };
    });
}

/**
 * Groups thousands with non-breaking spaces: 10000 -> 10␣000.
 * Numbers shorter than `minDigits` are left alone. 4-digit numbers between
 * 1800 and 2199 are treated as years unless a unit or currency follows.
 */
export function thousandsRule(minDigits: number, units: string[], explanation: string): TextRule {
  const re = /(?<![\d.,:/\-#_=?&+\p{L}])(?<!\d\.[ \u00a0])\d{4,}(?![\d\p{L}_]|[.,:/]\d)/gu;
  const unitAfter = new RegExp(`^[ ${NBSP}]?(?:${units.map(escape).join("|")})(?![\\p{L}\\d])`, "u");
  return (value) =>
    regexIssues(value, re, (m) => {
      const digits = m[0];
      if (digits.length < minDigits) return null;
      const n = Number(digits);
      const rest = value.slice(m.index! + digits.length);
      if (digits.length === 4 && n >= 1800 && n <= 2199 && !unitAfter.test(rest)) return null;
      return {
        rule: "typo-thousands",
        message: `Group the digits of ${digits} with non-breaking spaces`,
        explanation,
        replacement: digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP),
      };
    });
}
