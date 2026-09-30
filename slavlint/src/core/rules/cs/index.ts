import { textRulesAsRule } from "../../text.js";
import type { Rule } from "../../types.js";
import { pluralRule } from "../shared/plural.js";
import { csTextRules } from "./typography.js";

export { csTextRules };
export const csRules: Rule[] = [pluralRule, textRulesAsRule(csTextRules)];
