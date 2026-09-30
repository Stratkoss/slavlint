#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import pc from "picocolors";
import { LANGS, findLocaleFiles, fixFile, lintPath, type Lang } from "./core/index.js";
import { installCursor } from "./install.js";
import { countFindings, formatReport } from "./report.js";

const USAGE = `Usage: slavlint <path> [options]
       slavlint install-cursor [projectDir]

Lints Czech (cs) and Polish (pl) i18next locale files.
<path> can be a single JSON file or a folder (scanned recursively).

install-cursor registers the slavlint MCP server and agent rule in
<projectDir>/.cursor (default: current folder). No API key needed.

Options:
  --fix          Rewrite typography issues in place (plural issues are only reported)
  --json         Print findings as JSON
  --lang <cs|pl> Force the language instead of detecting it from the path
  -h, --help     Show this help`;

function main(): number {
  let args;
  try {
    args = parseArgs({
      allowPositionals: true,
      options: {
        fix: { type: "boolean", default: false },
        json: { type: "boolean", default: false },
        lang: { type: "string" },
        help: { type: "boolean", short: "h", default: false },
      },
    });
  } catch (err) {
    console.error(pc.red((err as Error).message) + "\n\n" + USAGE);
    return 2;
  }

  const { values, positionals } = args;
  if (values.help || positionals.length === 0) {
    console.log(USAGE);
    return values.help ? 0 : 2;
  }

  if (positionals[0] === "install-cursor") return runInstall(positionals[1] ?? ".");

  const lang = values.lang as Lang | undefined;
  if (lang && !LANGS.includes(lang)) {
    console.error(pc.red(`Unsupported language "${lang}". Use one of: ${LANGS.join(", ")}.`));
    return 2;
  }

  const results = [];
  for (const target of positionals) {
    if (!fs.existsSync(target)) {
      console.error(pc.red(`Path not found: ${target}`));
      return 2;
    }
    try {
      if (values.fix) {
        for (const file of findLocaleFiles(target)) {
          const changed = fixFile(file, lang);
          if (changed > 0 && !values.json) {
            console.log(`${pc.green("✎")} Fixed typography in ${changed} string${changed === 1 ? "" : "s"} in ${pc.underline(path.relative(process.cwd(), file) || file)}`);
          }
        }
      }
      results.push(...lintPath(target, lang));
    } catch (err) {
      console.error(pc.red((err as Error).message));
      return 2;
    }
  }

  if (results.length === 0) {
    console.error(pc.yellow(`No cs/pl locale files found in ${positionals.join(", ")}.`));
    return 0;
  }

  if (values.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(formatReport(results));
  }
  return countFindings(results).errors > 0 ? 1 : 0;
}

function runInstall(projectDir: string): number {
  if (!fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) {
    console.error(pc.red(`Not a directory: ${projectDir}`));
    return 2;
  }
  try {
    const { actions } = installCursor(projectDir);
    for (const action of actions) console.log(`${pc.green("✔")} ${action}`);
  } catch (err) {
    console.error(pc.red((err as Error).message));
    return 1;
  }
  console.log(pc.dim("No API key needed: the agent writes plural forms, slavlint verifies them."));
  console.log(pc.dim("Next: open the project in Cursor (or run cursor-agent there) and enable \"slavlint\" under MCP."));
  return 0;
}

process.exitCode = main();
