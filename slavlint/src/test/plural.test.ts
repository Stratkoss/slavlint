import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { detectLang, lintEntries, lintPath } from "../core/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("detects language from file name and folder", () => {
  assert.equal(detectLang("locales/cs.json"), "cs");
  assert.equal(detectLang("translations/pl-PL.json"), "pl");
  assert.equal(detectLang("locales/cs/common.json"), "cs");
  assert.equal(detectLang("locales/en.json"), null);
  assert.equal(detectLang("locales/cs/readme.md"), null);
});

test("reports missing Czech plural categories", () => {
  const findings = lintEntries(
    [
      { key: "items_one", value: "{{count}} položka" },
      { key: "items_other", value: "{{count}} položek" },
    ],
    "cs",
  );
  const missing = findings.filter((f) => f.rule === "plural-missing");
  assert.equal(missing.length, 1);
  assert.equal(missing[0].severity, "error");
  assert.match(missing[0].message, /_few/);
  assert.doesNotMatch(missing[0].message, /_many/);
  const decimal = findings.filter((f) => f.rule === "plural-missing-decimal");
  assert.equal(decimal.length, 1);
  assert.equal(decimal[0].severity, "warning");
  assert.match(decimal[0].message, /_many/);
});

test("decimal-only categories are warnings: cs _many, pl _other; pl _many stays an error", () => {
  const severities = (lang: "cs" | "pl", keys: string[]) =>
    lintEntries(keys.map((key) => ({ key, value: "x" })), lang)
      .filter((f) => f.rule.startsWith("plural-missing"))
      .map((f) => `${f.rule}:${f.severity}`);
  assert.deepEqual(severities("cs", ["a_one", "a_few", "a_other"]), ["plural-missing-decimal:warning"]);
  assert.deepEqual(severities("pl", ["a_one", "a_few", "a_many"]), ["plural-missing-decimal:warning"]);
  assert.deepEqual(severities("pl", ["a_one", "a_few", "a_other"]), ["plural-missing:error"]);
});

test("{{count}} without plural variants is only a warning", () => {
  const findings = lintEntries([{ key: "pieces", value: "{{count}} ks" }], "cs");
  assert.deepEqual(
    findings.filter((f) => f.rule.startsWith("plural-")).map((f) => [f.rule, f.severity]),
    [["plural-no-variants", "warning"]],
  );
});

test("decimal slot copied from the 5+ form is a warning", () => {
  const rules = (lang: "cs" | "pl", forms: Record<string, string>) =>
    lintEntries(Object.entries(forms).map(([cat, value]) => ({ key: `v_${cat}`, value })), lang)
      .filter((f) => f.rule === "plural-decimal-copy")
      .map((f) => `${f.key}:${f.severity}`);
  assert.deepEqual(rules("cs", { one: "1 varianta", few: "varianty", many: "variant", other: "variant" }), ["v_many:warning"]);
  assert.deepEqual(rules("cs", { one: "1 varianta", few: "varianty", many: "varianty", other: "variant" }), []);
  assert.deepEqual(rules("pl", { one: "wariant", few: "warianty", many: "wariantów", other: "wariantów" }), ["v_other:warning"]);
  assert.deepEqual(rules("pl", { one: "wariant", few: "warianty", many: "wariantów", other: "wariantu" }), []);
});

test("demo locales: no plural errors, only the Czech vocative greeting", () => {
  const results = lintPath(path.join(root, "../demo/locales"));
  assert.equal(results.length, 2);
  const errors = results.flatMap((r) => r.findings.filter((f) => f.severity === "error").map((f) => `${r.lang}:${f.rule}:${f.key}`));
  assert.deepEqual(errors, ["cs:vocative-greeting:greeting"]);
});

test("fixtures report the intentionally broken keys", () => {
  const results = lintPath(path.join(root, "fixtures"));
  const errorKeys = results
    .flatMap((r) => r.findings.filter((f) => f.severity === "error").map((f) => `${r.lang}:${f.key}`))
    .sort();
  assert.deepEqual(errorKeys, [
    "cs:cartCount",
    "cs:dear",
    "cs:greeting",
    "cs:hello",
    "cs:notifications.orders.pending",
    "pl:cartCount",
    "pl:user.comments.count",
  ]);
});
