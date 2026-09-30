import type { Edit, Finding, Rule, TextIssue, TextRule } from "./types.js";

export const NBSP = "\u00a0";

/** i18next interpolation, nesting and Trans tags. Edits touching these are dropped. */
const PROTECTED_RE = /\{\{[^}]*\}\}|\$t\([^)]*\)|<[^<>]*>/g;

function protectedRanges(value: string): Array<[number, number]> {
  return [...value.matchAll(PROTECTED_RE)].map((m) => [m.index, m.index + m[0].length]);
}

const overlaps = (e: Edit, [s, t]: [number, number]) => e.start < t && e.end > s;

/** Runs text rules and keeps only issues that are safe to apply together. */
export function collectIssues(value: string, rules: TextRule[]): TextIssue[] {
  const ranges = protectedRanges(value);
  const issues = rules
    .flatMap((rule) => rule(value))
    .filter((issue) => issue.edits.every((e) => !ranges.some((r) => overlaps(e, r))))
    .sort((a, b) => a.edits[0].start - b.edits[0].start);

  const taken: Edit[] = [];
  return issues.filter((issue) => {
    if (issue.edits.some((e) => taken.some((t) => overlaps(e, [t.start, t.end])))) return false;
    taken.push(...issue.edits);
    return true;
  });
}

export function applyEdits(value: string, edits: Edit[]): string {
  let out = value;
  for (const e of [...edits].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
  }
  return out;
}

/** Applies all fixable issues until the text is stable. */
export function fixText(value: string, rules: TextRule[]): string {
  let current = value;
  for (let i = 0; i < 5; i++) {
    const issues = collectIssues(current, rules);
    if (issues.length === 0) break;
    current = applyEdits(current, issues.flatMap((issue) => issue.edits));
  }
  return current;
}

/** Makes non-breaking spaces visible in terminal output and messages. */
export const showNbsp = (s: string) => s.replaceAll(NBSP, "␣");

function snippet(value: string, issue: TextIssue): { before: string; after: string } {
  const start = Math.min(...issue.edits.map((e) => e.start));
  const end = Math.max(...issue.edits.map((e) => e.end));
  let from = Math.max(0, start - 12);
  let to = Math.min(value.length, end + 12);
  while (from > 0 && from > start - 30 && !/\s/.test(value[from - 1])) from--;
  while (to < value.length && to < end + 30 && !/\s/.test(value[to])) to++;
  const shift = issue.edits.map((e) => ({ ...e, start: e.start - from, end: e.end - from }));
  const pre = from > 0 ? "…" : "";
  const post = to < value.length ? "…" : "";
  const window = value.slice(from, to);
  return {
    before: showNbsp(pre + window + post),
    after: showNbsp(pre + applyEdits(window, shift) + post),
  };
}

/** Adapts per-string text rules to a locale-file rule producing findings. */
export function textRulesAsRule(rules: TextRule[]): Rule {
  return ({ entries }) =>
    entries.flatMap((entry) =>
      collectIssues(entry.value, rules).map(
        (issue): Finding => ({
          rule: issue.rule,
          severity: "warning",
          key: entry.key,
          line: entry.line,
          message: issue.message,
          explanation: issue.explanation,
          fix: snippet(entry.value, issue),
        }),
      ),
    );
}

/** Builds issues from a global regex whose whole match is replaced. */
export function regexIssues(
  value: string,
  re: RegExp,
  build: (m: RegExpMatchArray) => Omit<TextIssue, "edits"> & { replacement: string } | null,
): TextIssue[] {
  const issues: TextIssue[] = [];
  for (const m of value.matchAll(re)) {
    const built = build(m);
    if (!built) continue;
    const { replacement, ...rest } = built;
    issues.push({ ...rest, edits: [{ start: m.index!, end: m.index! + m[0].length, replacement }] });
  }
  return issues;
}
