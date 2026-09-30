import vokativPkg from "vokativ";

const { vokativ } = vokativPkg;

/** Czech vocative of a first name. `vokativ` returns lowercase. */
export function vocativeFirstName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  const declined = vokativ(trimmed, null, false);
  return declined.charAt(0).toUpperCase() + declined.slice(1);
}
