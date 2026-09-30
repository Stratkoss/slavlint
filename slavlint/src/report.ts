import path from "node:path";
import pc from "picocolors";
import { LANG_NAMES, type FileResult } from "./core/index.js";

export function countFindings(results: FileResult[]) {
  let errors = 0;
  let warnings = 0;
  for (const r of results) {
    for (const f of r.findings) f.severity === "error" ? errors++ : warnings++;
  }
  return { errors, warnings };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function formatReport(results: FileResult[]): string {
  const out: string[] = [];

  for (const r of results) {
    const rel = path.relative(process.cwd(), r.file) || r.file;
    const header = `${pc.underline(rel)} ${pc.dim(`(${LANG_NAMES[r.lang]})`)}`;
    if (r.findings.length === 0) {
      out.push(`${pc.green("✔")} ${header}`);
      continue;
    }
    out.push("", header);
    for (const f of r.findings) {
      const loc = pc.dim(`${rel}:${f.line ?? 1}`);
      const sev = f.severity === "error" ? pc.red(pc.bold("error  ")) : pc.yellow(pc.bold("warning"));
      const key = f.key ? pc.cyan(f.key) : "";
      out.push(`  ${sev} ${key} ${f.message} ${pc.dim(`[${f.rule}]`)}`);
      if (f.fix) out.push(`          ${pc.red(f.fix.before)} ${pc.dim("→")} ${pc.green(f.fix.after)}`);
      out.push(`          ${pc.dim("↳")} ${f.explanation}`);
      out.push(`          ${loc}`);
    }
  }

  const { errors, warnings } = countFindings(results);
  const fixable = results.reduce((n, r) => n + r.findings.filter((f) => f.fix).length, 0);
  const summary = `${plural(errors, "error")}, ${plural(warnings, "warning")}`;
  const colored = errors > 0 ? pc.red(pc.bold(summary)) : warnings > 0 ? pc.yellow(pc.bold(summary)) : pc.green(pc.bold(summary));
  out.push("", `${colored} ${pc.dim(`in ${plural(results.length, "file")}`)}`);
  if (fixable > 0) out.push(pc.dim(`${fixable} fixable with --fix (␣ = non-breaking space)`));
  return out.join("\n");
}
