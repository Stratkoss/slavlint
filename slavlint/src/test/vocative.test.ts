import assert from "node:assert/strict";
import { test } from "node:test";
import { checkText, fixText, TEXT_RULES } from "../core/index.js";

const vocative = (text: string, lang: "cs" | "pl" = "cs") =>
  checkText(text, lang).filter((f) => f.rule === "vocative-greeting");

test("flags Czech greetings with a name placeholder as errors", () => {
  for (const text of ["Dobrý den, {{firstName}}", "Ahoj {{name}}!", "Vážený pane {{lastName}},", "Čau {{userName}}", "Dobrý den, {{ firstName }}"]) {
    const f = vocative(text);
    assert.equal(f.length, 1, text);
    assert.equal(f[0].severity, "error");
    assert.equal(f[0].fix, undefined);
  }
});

test("ignores vocative placeholders, non-name placeholders and Polish", () => {
  assert.deepEqual(vocative("Dobrý den, {{firstNameVocative}}"), []);
  assert.deepEqual(vocative("Vítejte, máte {{count}} ks"), []);
  assert.deepEqual(vocative("Přidat {{name}} do košíku"), []);
  assert.deepEqual(vocative("Dzień dobry, {{firstName}}", "pl"), []);
});

test("vocative greeting is never auto-fixed", () => {
  assert.equal(fixText("Ahoj {{name}}", TEXT_RULES.cs), "Ahoj {{name}}");
});
