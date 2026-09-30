import type { Entry } from "./types.js";

/** Flattens nested i18next JSON into dotted keys, keeping only string leaves. */
export function flattenLocale(data: unknown, raw?: string): Entry[] {
  const entries: Entry[] = [];

  const walk = (node: unknown, segments: string[]) => {
    if (typeof node === "string") {
      entries.push({
        key: segments.join("."),
        value: node,
        line: raw ? locateLine(raw, segments) : undefined,
      });
    } else if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) walk(v, [...segments, k]);
    }
  };

  walk(data, []);
  return entries;
}

/**
 * Finds the line of a nested key by searching for each segment in turn,
 * each one after the previous. Good enough for well-formed locale files.
 */
function locateLine(raw: string, segments: string[]): number | undefined {
  let offset = 0;
  for (const seg of segments) {
    const re = new RegExp(`"${escapeRegExp(JSON.stringify(seg).slice(1, -1))}"\\s*:`, "g");
    re.lastIndex = offset;
    const m = re.exec(raw);
    if (!m) return undefined;
    offset = m.index + m[0].length;
  }
  return raw.slice(0, offset).split("\n").length;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
