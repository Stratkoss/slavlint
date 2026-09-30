import fs from "node:fs";
import path from "node:path";
import { detectLang } from "./detect.js";
import { flattenLocale } from "./locale.js";
import { csRules, csTextRules } from "./rules/cs/index.js";
import { plRules, plTextRules } from "./rules/pl/index.js";
import { NBSP, fixText } from "./text.js";
import type { Entry, FileResult, Finding, Lang, Rule, TextRule } from "./types.js";

export const RULES: Record<Lang, Rule[]> = { cs: csRules, pl: plRules };
export const TEXT_RULES: Record<Lang, TextRule[]> = { cs: csTextRules, pl: plTextRules };

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "out", "coverage", ".turbo", ".vercel"]);

export function lintEntries(entries: Entry[], lang: Lang): Finding[] {
  const findings = RULES[lang].flatMap((rule) => rule({ lang, entries }));
  const rank = (f: Finding) => (f.severity === "error" ? 0 : 1);
  return findings.sort((a, b) => (a.line ?? 0) - (b.line ?? 0) || rank(a) - rank(b));
}

/** Checks a single UI string (no file context). */
export function checkText(text: string, lang: Lang): Finding[] {
  return lintEntries([{ key: "", value: text }], lang);
}

function resolveLang(file: string, lang?: Lang): Lang {
  const resolved = lang ?? detectLang(file);
  if (!resolved) {
    throw new Error(`Can't detect language of ${file}. Name it cs.json / pl.json, put it in a cs/ or pl/ folder, or pass --lang.`);
  }
  return resolved;
}

/**
 * Rewrites typography issues in place. Only string values change; keys,
 * order, indentation and {{placeholders}} are preserved. Non-breaking spaces
 * are written as \u00a0 so they stay visible in diffs. Returns the number of
 * changed strings (0 for invalid JSON, which is left untouched).
 */
export function fixFile(file: string, lang?: Lang): number {
  const rules = TEXT_RULES[resolveLang(file, lang)];
  const raw = fs.readFileSync(file, "utf8");
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return 0;
  }

  let changed = 0;
  const walk = (node: unknown): unknown => {
    if (typeof node === "string") {
      const fixed = fixText(node, rules);
      if (fixed !== node) changed++;
      return fixed;
    }
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === "object") {
      return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, walk(v)]));
    }
    return node;
  };
  const fixed = walk(data);
  if (changed === 0) return 0;

  const indent = raw.match(/^([ \t]+)"/m)?.[1] ?? 2;
  const out = JSON.stringify(fixed, null, indent).replaceAll(NBSP, "\\u00a0") + (raw.endsWith("\n") ? "\n" : "");
  fs.writeFileSync(file, out);
  return changed;
}

export function lintFile(file: string, lang?: Lang): FileResult {
  const resolvedLang = resolveLang(file, lang);

  const raw = fs.readFileSync(file, "utf8");
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    return {
      file,
      lang: resolvedLang,
      findings: [
        {
          rule: "json-invalid",
          severity: "error",
          key: "",
          message: `Invalid JSON: ${(err as Error).message}`,
          explanation: "i18next can't load this file at all, so every text falls back to the fallback language.",
        },
      ],
    };
  }

  return { file, lang: resolvedLang, findings: lintEntries(flattenLocale(data, raw), resolvedLang) };
}

/** Finds cs/pl locale files. A file path is returned as-is; folders are scanned recursively. */
export function findLocaleFiles(target: string): string[] {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];

  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(full);
      } else if (entry.isFile() && detectLang(full)) {
        found.push(full);
      }
    }
  };
  walk(target);
  return found.sort();
}

export function lintPath(target: string, lang?: Lang): FileResult[] {
  return findLocaleFiles(target).map((file) => lintFile(file, lang));
}
