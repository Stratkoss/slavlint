import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { NBSP, TEXT_RULES, checkText, fixFile, fixText, lintFile } from "../core/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const n = (s: string) => s.replaceAll("␣", NBSP);
const cs = (s: string) => fixText(s, TEXT_RULES.cs);
const pl = (s: string) => fixText(s, TEXT_RULES.pl);

test("Czech one-letter words, including uppercase at the start", () => {
  assert.equal(cs("V košíku je zboží a dárek"), n("V␣košíku je zboží a␣dárek"));
  assert.equal(cs("Hledat v {{category}}"), n("Hledat v␣{{category}}"));
  assert.equal(cs("O den dřív"), n("O␣den dřív"));
});

test("Czech number/placeholder + unit, thousands, dates, quotes", () => {
  assert.equal(cs("Kamenina, 250 ml"), n("Kamenina, 250␣ml"));
  assert.equal(cs("{{count}} ks"), n("{{count}}␣ks"));
  assert.equal(cs("nad 10000 Kč"), n("nad 10␣000␣Kč"));
  assert.equal(cs("Sleva 1500 Kč"), n("Sleva 1␣500␣Kč"));
  assert.equal(cs("Doručíme 30.9.2026"), n("Doručíme 30.␣9.␣2026"));
  assert.equal(cs("Doručení 30.9.2026 s kurýrem"), n("Doručení 30.␣9.␣2026 s␣kurýrem"));
  assert.equal(cs('Klikněte na "Uložit"'), "Klikněte na „Uložit“");
  assert.equal(cs("Produkt “{{name}}” přidán"), "Produkt „{{name}}“ přidán");
});

test("Czech leaves years and version numbers alone", () => {
  assert.equal(cs("Založeno roku 1998"), "Založeno roku 1998");
  assert.equal(cs("Verze 1.2.3"), "Verze 1.2.3");
});

test("Polish does not group 4-digit numbers", () => {
  assert.equal(pl("Rabat 1500 zł"), n("Rabat 1500␣zł"));
  assert.equal(pl("powyżej 10000 zł"), n("powyżej 10␣000␣zł"));
  assert.equal(pl("Dostawa w piątek z kurierem"), n("Dostawa w␣piątek z␣kurierem"));
  assert.equal(pl("{{count}} szt."), n("{{count}}␣szt."));
});

test("placeholders are never changed", () => {
  for (const text of ["{{a b}}", "{{count, number}} ks", "{{v 1000}}", '<1 class="x">v 5</1>', "$t(a b)"]) {
    const fixed = cs(text);
    const placeholders = (s: string) => s.match(/\{\{[^}]*\}\}|\$t\([^)]*\)|<[^<>]*>/g);
    assert.deepEqual(placeholders(fixed), placeholders(text));
  }
});

test("fixes are idempotent and leave no typography findings", () => {
  const fixed = cs("V 30.9.2026 u nás 10000 ks za \"akci\"");
  assert.equal(cs(fixed), fixed);
  assert.deepEqual(checkText(fixed, "cs").filter((f) => f.rule.startsWith("typo-")), []);
});

test("--fix rewrites a file but keeps plural findings", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "slavlint-"));
  for (const lang of ["cs", "pl"]) {
    const file = path.join(dir, `${lang}.json`);
    fs.copyFileSync(path.join(root, "fixtures", `${lang}.json`), file);
    assert.ok(fixFile(file) > 0);
    const findings = lintFile(file).findings;
    assert.deepEqual(findings.filter((f) => f.rule.startsWith("typo-")), []);
    assert.ok(findings.some((f) => f.rule === "plural-missing"));
    assert.match(fs.readFileSync(file, "utf8"), /\\u00a0/);
  }
  fs.rmSync(dir, { recursive: true });
});
