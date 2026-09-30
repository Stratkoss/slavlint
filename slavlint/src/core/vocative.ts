import vokativPkg from "vokativ";

const { vokativ, isWoman } = vokativPkg;

export interface VocativeResult {
  name: string;
  vocative: string;
  woman: boolean;
  greeting: string;
}

/** vokativ returns lowercase; restore the capitalization of the input. */
function matchCase(original: string, declined: string): string {
  if (original === original.toUpperCase()) return declined.toUpperCase();
  return declined.charAt(0).toUpperCase() + declined.slice(1);
}

/** Czech vocative of a first name or "First Last". */
export function czechVocative(name: string): VocativeResult {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) throw new Error("name is empty");
  const woman = isWoman(parts[0]);
  const declined = parts.map((part, i) => matchCase(part, vokativ(part, woman, i > 0)));
  const vocative = declined.join(" ");
  return { name: parts.join(" "), vocative, woman, greeting: `Dobrý den, ${vocative}` };
}
