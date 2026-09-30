import path from "node:path";
import type { Lang } from "./types.js";

const LOCALE_RE = /^(cs|pl)(?:[-_][a-z]{2})?$/i;

/**
 * Detects the language from the file name (cs.json, pl-PL.json) or,
 * failing that, from the nearest matching folder (locales/cs/common.json).
 */
export function detectLang(filePath: string): Lang | null {
  const ext = path.extname(filePath);
  if (ext.toLowerCase() !== ".json") return null;

  const base = path.basename(filePath, ext);
  const fromName = base.match(LOCALE_RE);
  if (fromName) return fromName[1].toLowerCase() as Lang;

  const dirs = path.resolve(path.dirname(filePath)).split(path.sep).reverse();
  for (const dir of dirs) {
    const m = dir.match(LOCALE_RE);
    if (m) return m[1].toLowerCase() as Lang;
  }
  return null;
}
