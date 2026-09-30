import { NBSP, regexIssues } from "../../text.js";
import type { TextIssue, TextRule } from "../../types.js";
import { oneLetterWordRule, thousandsRule, unitRule } from "../shared/typography.js";

// No "s" (seconds): it collides with the preposition "s" ("2026 s kurýrem").
export const CS_UNITS = [
  "ml", "dl", "cl", "l", "mg", "g", "dkg", "kg", "mm", "cm", "m", "km", "m²", "m³",
  "ms", "min", "h", "°C", "%", "Kč", "CZK", "€", "EUR", "ks", "kB", "MB", "GB", "TB", "W", "kW",
];

const dateRule: TextRule = (value) =>
  regexIssues(value, /(?<![\d.])(\d{1,2})\.(\d{1,2})\.(\d{4})?(?!\d)/g, (m) => {
    const [, d, mo, y] = m;
    if (+d < 1 || +d > 31 || +mo < 1 || +mo > 12) return null;
    const fixed = `${d}.${NBSP}${mo}.` + (y ? `${NBSP}${y}` : "");
    return {
      rule: "typo-date",
      message: `Write the date as "${d}. ${mo}.${y ? ` ${y}` : ""}" with spaces after the dots`,
      explanation: `Czech dates have a space after each dot (30. 9. 2026). "${m[0]}" is a machine format; the spaces are non-breaking so the date never wraps.`,
      replacement: fixed,
    };
  });

const QUOTE_PAIRS: Array<[RegExp, string]> = [
  [/"([^"\n]+)"/g, 'English "…"'],
  [/“([^“”"\n]+)”/g, "English “…”"],
  [/„([^„“”"\n]+)”/g, "Polish „…”"],
];

const quotesRule: TextRule = (value) => {
  const issues: TextIssue[] = [];
  for (const [re, kind] of QUOTE_PAIRS) {
    for (const m of value.matchAll(re)) {
      const start = m.index!;
      const end = start + m[0].length;
      issues.push({
        rule: "typo-quotes",
        message: `Use Czech quotes „…“ instead of ${kind}`,
        explanation: `Czech uses low-high quotation marks „like this“. ${kind} quotes look foreign to Czech readers and are a typical sign of machine-generated text.`,
        edits: [
          { start, end: start + 1, replacement: "„" },
          { start: end - 1, end, replacement: "“" },
        ],
      });
    }
  }
  return issues;
};

export const csTextRules: TextRule[] = [
  oneLetterWordRule(
    "ksvzouai",
    "Czech typography forbids a one-letter preposition or conjunction (k, s, v, z, o, u, a, i) at the end of a line. With a normal space the browser may wrap right after it, leaving it dangling.",
  ),
  unitRule(
    CS_UNITS,
    "A number and its unit must stay on one line, otherwise \"250\" and \"ml\" can end up on different lines.",
  ),
  thousandsRule(
    4,
    CS_UNITS,
    "Czech groups digits by thousands with a space (1 000, 25 000). \"1000\" reads as an English or code format.",
  ),
  dateRule,
  quotesRule,
];
