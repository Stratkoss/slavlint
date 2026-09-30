import type { Lang } from "./types.js";

/**
 * Offline fallback for plural_forms: common UI nouns in the form used after
 * a number, keyed by Intl.PluralRules category. "many" in Czech and "other"
 * in Polish are the decimal forms (1,5 položky / 1,5 pozycji).
 */
export const DICTIONARY: Array<Record<Lang, Record<string, string>>> = [
  {
    cs: { one: "položka", few: "položky", many: "položky", other: "položek" },
    pl: { one: "pozycja", few: "pozycje", many: "pozycji", other: "pozycji" },
  },
  {
    cs: { one: "soubor", few: "soubory", many: "souboru", other: "souborů" },
    pl: { one: "plik", few: "pliki", many: "plików", other: "pliku" },
  },
  {
    cs: { one: "den", few: "dny", many: "dne", other: "dní" },
    pl: { one: "dzień", few: "dni", many: "dni", other: "dnia" },
  },
  {
    cs: { one: "uživatel", few: "uživatelé", many: "uživatele", other: "uživatelů" },
    pl: { one: "użytkownik", few: "użytkowników", many: "użytkowników", other: "użytkownika" },
  },
  {
    cs: { one: "zpráva", few: "zprávy", many: "zprávy", other: "zpráv" },
    pl: { one: "wiadomość", few: "wiadomości", many: "wiadomości", other: "wiadomości" },
  },
  {
    cs: { one: "objednávka", few: "objednávky", many: "objednávky", other: "objednávek" },
    pl: { one: "zamówienie", few: "zamówienia", many: "zamówień", other: "zamówienia" },
  },
  {
    cs: { one: "produkt", few: "produkty", many: "produktu", other: "produktů" },
    pl: { one: "produkt", few: "produkty", many: "produktów", other: "produktu" },
  },
  {
    cs: { one: "kus", few: "kusy", many: "kusu", other: "kusů" },
    pl: { one: "sztuka", few: "sztuki", many: "sztuk", other: "sztuki" },
  },
  {
    cs: { one: "minuta", few: "minuty", many: "minuty", other: "minut" },
    pl: { one: "minuta", few: "minuty", many: "minut", other: "minuty" },
  },
  {
    cs: { one: "hodina", few: "hodiny", many: "hodiny", other: "hodin" },
    pl: { one: "godzina", few: "godziny", many: "godzin", other: "godziny" },
  },
  {
    cs: { one: "komentář", few: "komentáře", many: "komentáře", other: "komentářů" },
    pl: { one: "komentarz", few: "komentarze", many: "komentarzy", other: "komentarza" },
  },
  {
    cs: { one: "výsledek", few: "výsledky", many: "výsledku", other: "výsledků" },
    pl: { one: "wynik", few: "wyniki", many: "wyników", other: "wyniku" },
  },
  {
    cs: { one: "stránka", few: "stránky", many: "stránky", other: "stránek" },
    pl: { one: "strona", few: "strony", many: "stron", other: "strony" },
  },
  {
    cs: { one: "kategorie", few: "kategorie", many: "kategorie", other: "kategorií" },
    pl: { one: "kategoria", few: "kategorie", many: "kategorii", other: "kategorii" },
  },
  {
    cs: { one: "varianta", few: "varianty", many: "varianty", other: "variant" },
    pl: { one: "wariant", few: "warianty", many: "wariantów", other: "wariantu" },
  },
];

/** Looks up a word by its Czech or Polish singular and returns forms in `lang`. */
export function lookupForms(word: string, lang: Lang): Record<string, string> | null {
  const w = word.trim().toLowerCase();
  const entry = DICTIONARY.find((e) => e.cs.one === w || e.pl.one === w);
  return entry ? entry[lang] : null;
}
