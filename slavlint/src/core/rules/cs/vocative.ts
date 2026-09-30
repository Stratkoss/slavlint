import type { Finding, Rule } from "../../types.js";

const GREETINGS = [
  "dobrý den", "dobré ráno", "dobré odpoledne", "dobrý večer", "ahoj", "čau", "čus", "nazdar",
  "zdravím", "zdravíme", "vítejte", "vítej", "milý", "milá", "milí", "vážený pane", "vážená paní",
  "vážený", "vážená", "vážení", "děkujeme", "díky",
];

const GREETING_RE = new RegExp(
  `(?<!\\p{L})(${GREETINGS.join("|")})[\\s,]*(\\{\\{\\s*([^},]+?)\\s*(?:,[^}]*)?\\}\\})`,
  "giu",
);
const NAME_RE = /name|jmeno|jméno|user|customer|zakaznik|zákazník|person|recipient|nick/i;
const ALREADY_VOCATIVE_RE = /voc|vokativ|vocative|osloveni|oslovení|salutation/i;

/**
 * Czech greetings address people in the vocative ("Dobrý den, Petře"), but
 * i18next inserts the name as-is ("Dobrý den, Petr"). Not auto-fixable: the
 * name has to be declined in code.
 */
export const vocativeRule: Rule = ({ entries }) => {
  const findings: Finding[] = [];
  for (const entry of entries) {
    for (const m of entry.value.matchAll(GREETING_RE)) {
      const [matched, , , variable] = m;
      if (!NAME_RE.test(variable) || ALREADY_VOCATIVE_RE.test(variable)) continue;
      const vocVar = `${variable.replace(/[^\w]/g, "")}Vocative`;
      findings.push({
        rule: "vocative-greeting",
        severity: "error",
        key: entry.key,
        line: entry.line,
        message: `Greeting "${matched}" puts the name in the nominative; use {{${vocVar}}} instead`,
        explanation: `Czech addresses people in the vocative case: "Dobrý den, Petře", not "Dobrý den, Petr". i18next inserts the name unchanged, so every greeting sounds wrong to Czech users. Decline the name in code with the vokativ package and pass it separately: t("${entry.key || "greeting"}", { ${vocVar}: vokativ(${variable.replace(/[^\w]/g, "")}) }).`,
      });
      break;
    }
  }
  return findings;
};
