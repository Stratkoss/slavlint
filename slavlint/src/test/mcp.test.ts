import assert from "node:assert/strict";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { pluralCategories } from "../core/index.js";

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

test("lists the four tools", async () => {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ["check_text", "lint_locale_file", "plural_forms", "vocative"]);
});

test("lint_locale_file returns the same findings as the CLI core", async () => {
  const data = await call("lint_locale_file", { path: path.join(root, "fixtures/cs.json") });
  assert.equal(data.errors, 5);
  assert.ok(data.files[0].findings.some((f: any) => f.rule === "vocative-greeting" && f.key === "greeting"));
  assert.equal(data.files[0].lang, "cs");
});

test("check_text returns findings and a fixed string", async () => {
  const data = await call("check_text", { text: "V košíku je {{count}} ks", lang: "cs" });
  assert.ok(data.findings.length >= 2);
  assert.equal(data.fixed, "V\u00a0košíku je {{count}}\u00a0ks");
});

test("plural_forms falls back to the dictionary and matches Intl.PluralRules", async () => {
  const cs = await call("plural_forms", { word: "položka", lang: "cs", key: "cart.items" });
  assert.equal(cs.source, "dictionary");
  assert.deepEqual(Object.keys(cs.forms), pluralCategories("cs"));
  assert.equal(cs.i18next["cart.items_few"], "{{count}} položky");
  const pl = await call("plural_forms", { word: "soubor", lang: "pl" });
  assert.equal(pl.forms.many, "plików");
});

test("vocative declines Czech names", async () => {
  assert.equal((await call("vocative", { name: "Petr" })).vocative, "Petře");
  assert.equal((await call("vocative", { name: "Jana Nováková" })).vocative, "Jano Nováková");
});
