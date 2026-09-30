import type { TextRule } from "../../types.js";
import { oneLetterWordRule, thousandsRule, unitRule } from "../shared/typography.js";

export const PL_UNITS = [
  "ml", "dl", "cl", "l", "mg", "g", "dag", "kg", "mm", "cm", "m", "km", "m²", "m³",
  "ms", "s", "min", "h", "godz.", "°C", "%", "zł", "PLN", "€", "EUR", "szt.", "kB", "MB", "GB", "TB", "W", "kW",
];

export const plTextRules: TextRule[] = [
  oneLetterWordRule(
    "wzouia",
    "Polish typography does not allow one-letter words (w, z, o, u, i, a) at the end of a line. With a normal space the browser may wrap right after it, leaving it dangling.",
  ),
  unitRule(
    PL_UNITS,
    "A number and its unit must stay on one line, otherwise \"250\" and \"ml\" can end up on different lines.",
  ),
  // Polish does not group 4-digit numbers (1000), only 5+ digits (10 000).
  thousandsRule(
    5,
    PL_UNITS,
    "Polish groups digits of numbers with five or more digits using a space (10 000). Four-digit numbers stay ungrouped.",
  ),
];
