#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { TEXT_RULES, checkText, fixText, lintPath, type Lang } from "./core/index.js";
import { czechVocative } from "./core/vocative.js";
import { pluralForms } from "./grok.js";

const lang = z.enum(["cs", "pl"]).describe('Language: "cs" (Czech) or "pl" (Polish)');

function result(data: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function failure(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

const server = new McpServer({ name: "slavlint", version: "0.1.0" });

server.registerTool(
  "lint_locale_file",
  {
    title: "Lint Czech/Polish locale file",
    description:
      "Lints an i18next JSON locale file (or a folder, scanned recursively) for Czech and Polish plural, grammar and typography mistakes. Same checks as the slavlint CLI. Run this on every cs/pl locale file you edited before finishing. Pass an absolute path.",
    inputSchema: {
      path: z.string().describe("Absolute path to a cs/pl locale JSON file or a folder containing them"),
      lang: lang.optional().describe("Force the language instead of detecting it from the file name"),
    },
  },
  async ({ path: target, lang }) => {
    const resolved = path.resolve(target);
    if (!fs.existsSync(resolved)) return failure(`Path not found: ${resolved}`);
    try {
      const files = lintPath(resolved, lang);
      const all = files.flatMap((f) => f.findings);
      return result({
        errors: all.filter((f) => f.severity === "error").length,
        warnings: all.filter((f) => f.severity === "warning").length,
        fixable: all.filter((f) => f.fix).length,
        files,
        hint: all.some((f) => f.fix) ? "Typography warnings can be fixed with `npx slavlint <path> --fix`." : undefined,
      });
    } catch (err) {
      return failure((err as Error).message);
    }
  },
);

server.registerTool(
  "check_text",
  {
    title: "Check a Czech/Polish UI string",
    description:
      "Checks a single Czech or Polish UI string for typography and grammar issues and returns the findings plus an auto-fixed version (non-breaking spaces written as \\u00a0). Placeholders like {{count}} are never changed.",
    inputSchema: { text: z.string(), lang },
  },
  async ({ text, lang }) => {
    const findings = checkText(text, lang as Lang);
    const fixed = fixText(text, TEXT_RULES[lang as Lang]);
    return result({ text, lang, findings, fixed, changed: fixed !== text });
  },
);

server.registerTool(
  "plural_forms",
  {
    title: "Plural word forms for i18next",
    description:
      "Returns the Czech or Polish forms of a noun mapped to the correct Intl.PluralRules categories (cs/pl: one, few, many, other) plus a ready-to-use i18next key set. Use this whenever you write a text with {{count}}. Uses Grok when XAI_API_KEY is set, otherwise a built-in dictionary of common UI words. Results are always validated against Intl.PluralRules.",
    inputSchema: {
      word: z.string().describe('Noun in singular, e.g. "položka", "plik" or an English word like "file"'),
      lang,
      key: z.string().optional().describe('Base i18next key, e.g. "cart.itemCount". Defaults to "<word>Count".'),
    },
  },
  async ({ word, lang, key }) => {
    try {
      return result({ ...(await pluralForms(word, lang as Lang, key)) });
    } catch (err) {
      return failure((err as Error).message);
    }
  },
);

server.registerTool(
  "vocative",
  {
    title: "Czech vocative of a name",
    description:
      'Returns the Czech vocative (5th case) of a first name or "First Last", used for greetings: "Dobrý den, Petře" instead of "Dobrý den, Petr". Pass the vocative from code as a separate placeholder, e.g. {{firstNameVocative}}.',
    inputSchema: { name: z.string().describe('Name in nominative, e.g. "Petr" or "Jana Nováková"') },
  },
  async ({ name }) => {
    try {
      return result({ ...czechVocative(name) });
    } catch (err) {
      return failure((err as Error).message);
    }
  },
);

await server.connect(new StdioServerTransport());
