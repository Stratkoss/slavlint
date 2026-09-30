#!/usr/bin/env node
// Renders one plural key through real i18next for several counts, side by side
// for two locale files. Lines where i18next fell back to English are marked.
//
//   node scripts/render-demo.mjs <key> <label>=<locale.json> <label>=<locale.json> [--counts 1,2,3,5,1.5]
//
// The language comes from the file name (cs.json, pl.json). The fallback is
// en.json next to each file.

import fs from "node:fs";
import path from "node:path";
import i18next from "i18next";
import pc from "picocolors";

const args = process.argv.slice(2);
const countsFlag = args.indexOf("--counts");
const counts = countsFlag >= 0 ? args.splice(countsFlag, 2)[1].split(",").map(Number) : [1, 2, 3, 5, 1.5];
const [key, ...columns] = args;

if (!key || columns.length !== 2 || columns.some((c) => !c.includes("="))) {
  console.error("Usage: node scripts/render-demo.mjs <key> <label>=<locale.json> <label>=<locale.json> [--counts 1,2,3,5,1.5]");
  process.exit(2);
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

async function renderer(file) {
  const lng = path.basename(file, ".json");
  const enFile = path.join(path.dirname(file), "en.json");
  const resources = { [lng]: { translation: readJson(file) } };
  if (fs.existsSync(enFile)) resources.en = { translation: readJson(enFile) };
  const t = await i18next.createInstance().init({
    lng,
    fallbackLng: "en",
    resources,
    initAsync: false,
    interpolation: { escapeValue: false },
  });
  return { lng, render: (count) => t(key, { count, returnDetails: true }) };
}

const cols = await Promise.all(
  columns.map(async (c) => {
    const [label, file] = [c.slice(0, c.indexOf("=")), c.slice(c.indexOf("=") + 1)];
    return { label, ...(await renderer(file)) };
  }),
);

const lng = cols[0].lng;
const plural = new Intl.PluralRules(lng);
const ENGLISH = "← English";

const rows = counts.map((count) => ({
  count: String(count),
  category: plural.select(count),
  cells: cols.map((col) => {
    const { res, usedLng } = col.render(count);
    return { text: String(res), english: usedLng !== col.lng };
  }),
}));

const cellText = (c) => (c.english ? `${c.text}  ${ENGLISH}` : c.text);
const widths = cols.map((col, i) => Math.max(col.label.length, ...rows.map((r) => cellText(r.cells[i]).length)));
const countW = Math.max(5, ...rows.map((r) => r.count.length));
const catW = Math.max(8, ...rows.map((r) => r.category.length + 1));
const gap = "    ";

const paint = (c, width) => {
  const pad = " ".repeat(width - cellText(c).length);
  return c.english ? pc.red(`${c.text}  ${pc.bold(ENGLISH)}`) + pad : pc.green(c.text) + pad;
};

const out = [];
out.push("");
out.push(`  ${pc.bold(key)}  ${pc.dim(`· ${lng} · rendered with i18next · fallback en`)}`);
out.push("");
out.push(
  "  " + pc.dim("count".padEnd(countW)) + "  " + pc.dim("form".padEnd(catW)) + gap +
    cols.map((col, i) => pc.bold(col.label.padEnd(widths[i]))).join(gap),
);
out.push("  " + pc.dim("─".repeat(countW) + "  " + "─".repeat(catW) + gap + widths.map((w) => "─".repeat(w)).join(gap)));
for (const r of rows) {
  out.push(
    "  " + r.count.padEnd(countW) + "  " + pc.dim(`_${r.category}`.padEnd(catW)) + gap +
      r.cells.map((c, i) => paint(c, widths[i])).join(gap),
  );
}
out.push("");
const summary = cols.map((col, i) => {
  const english = rows.filter((r) => r.cells[i].english).length;
  return english
    ? pc.red(`${col.label}: ${english}/${rows.length} counts show English`)
    : pc.green(`${col.label}: all ${rows.length} counts in ${lng}`);
});
out.push("  " + summary.join(pc.dim("   ·   ")));
out.push("");
console.log(out.join("\n"));
