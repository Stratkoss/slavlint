import { textRulesAsRule } from "../../text.js";
import type { Rule } from "../../types.js";
import { pluralRule } from "../shared/plural.js";
import { plTextRules } from "./typography.js";

export { plTextRules };
export const plRules: Rule[] = [pluralRule, textRulesAsRule(plTextRules)];
