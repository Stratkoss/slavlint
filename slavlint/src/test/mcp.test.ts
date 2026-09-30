import assert from "node:assert/strict";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { GRAMMAR_HINTS, pluralCategories } from "../core/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const client = new Client({ name: "slavlint-test", version: "0.0.0" });

before(async () => {
  const env = { ...process.env } as Record<string, string>;
  delete env.XAI_API_KEY;
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, "dist/mcp.js")], env }));
});
after(() => client.close());

async function call(name: string, args: Record<string, unknown>) {
  const res = await client.callTool({ name, arguments: args });
  assert.ok(!res.isError, JSON.stringify(res.content));
  return res.structuredContent as any;
}

test("lists the five tools", async () => {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), [
    "check_text",
    "lint_locale_file",
    "plural_forms",
    "verify_plural_forms",
    "vocative",
  ]);
});

test("lint_locale_file returns the same findings as the CLI core", async () => {
  const data = await call("lint_locale_file", { path: path.join(root, "fixtures/cs.json") });
  assert.equal(data.errors, 5);
  assert.ok(data.files[0].findings.some((f: any) => f.rule === "vocative-greeting" && f.key === "greeting"));
});

test("check_text returns findings and a fixed string", async () => {
  const data = await call("check_text", { text: "V košíku je {{count}} ks", lang: "cs" });
  assert.ok(data.findings.length >= 2);
  assert.equal(data.fixed, "V\u00a0košíku je {{count}}\u00a0ks");
});

test("grammar hints cover exactly the Intl.PluralRules categories", () => {
  for (const lang of ["cs", "pl"] as const) {
    assert.deepEqual(Object.keys(GRAMMAR_HINTS[lang]).sort(), [...pluralCategories(lang)].sort());
  }
});

test("plural_forms is a guide: categories, counts, hints, instruction", async () => {
  const cs = await call("plural_forms", { word: "klávesnice", lang: "cs" });
  assert.deepEqual(
    cs.categories.map((c: any) => [c.category, c.counts]),
    [["one", "1"], ["few", "2, 3, 4"], ["many", "1,5"], ["other", "0, 5, 10"]],
  );
  assert.match(cs.categories[2].hint, /genitive singular/);
  assert.equal(cs.knownForms, undefined);
  assert.match(cs.instruction, /verify_plural_forms/);
  assert.equal(cs.suggestion, undefined);

  const known = await call("plural_forms", { word: "soubor", lang: "pl" });
  assert.deepEqual(known.knownForms, { one: "plik", few: "pliki", many: "plików", other: "pliku" });
});

test("verify_plural_forms: success returns the i18next key set", async () => {
  const data = await call("verify_plural_forms", {
    lang: "cs",
    key: "cart.items",
    forms: { one: "položka", few: "položky", many: "položky", other: "položek" },
  });
  assert.equal(data.ok, true);
  assert.deepEqual(data.warnings, []);
  assert.equal(data.dictionaryWord, "položka");
  assert.equal(data.i18next["cart.items_few"], "{{count}} položky");
  assert.match(data.scope, /Not verified/);
});

test("verify_plural_forms: missing/empty is an error, decimal copy and dictionary mismatch are warnings", async () => {
  const missing = await call("verify_plural_forms", { lang: "cs", forms: { one: "klávesnice", few: "", other: "klávesnic" } });
  assert.equal(missing.ok, false);
  assert.deepEqual(missing.errors.map((e: any) => e.key.split("_").pop()).sort(), ["few", "many"]);
  assert.equal(missing.i18next, undefined);

  const copy = await call("verify_plural_forms", {
    lang: "pl",
    key: "variantCount",
    forms: { one: "wariant", few: "warianty", many: "wariantów", other: "wariantów" },
  });
  assert.equal(copy.ok, true);
  const rules = copy.warnings.map((w: any) => `${w.rule}:${w.key}`).sort();
  assert.deepEqual(rules, ["plural-decimal-copy:variantCount_other", "plural-dictionary-mismatch:variantCount_other"]);
  assert.equal(copy.i18next["variantCount_other"], "{{count}} wariantów");
});

test("vocative declines Czech names", async () => {
  assert.equal((await call("vocative", { name: "Petr" })).vocative, "Petře");
  assert.equal((await call("vocative", { name: "Jana Nováková" })).vocative, "Jano Nováková");
});
