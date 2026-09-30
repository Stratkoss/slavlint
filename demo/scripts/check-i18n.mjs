import { readFileSync } from "node:fs";

import i18next from "i18next";

const load = (lng) =>
  JSON.parse(readFileSync(new URL(`../locales/${lng}.json`, import.meta.url)));

const cs = load("cs");
const pl = load("pl");

await i18next.init({
  lng: "cs",
  fallbackLng: "cs",
  resources: {
    cs: { translation: cs },
    pl: { translation: pl },
  },
  interpolation: { escapeValue: false },
});

const failures = [];

function expect(actual, expected) {
  if (actual !== expected) {
    failures.push(`expected ${JSON.stringify(expected)}\n     got ${JSON.stringify(actual)}`);
  }
}

const currency = {
  formatParams: {
    total: { currency: "CZK", maximumFractionDigits: 0 },
    price: { currency: "CZK", maximumFractionDigits: 0 },
  },
};
const dated = {
  date: new Date(2026, 9, 3, 12),
  formatParams: { date: { dateStyle: "long" } },
};

await i18next.changeLanguage("cs");
expect(i18next.t("greeting", { firstName: "Anna" }), "Dobrý den, Anna");
expect(i18next.t("cartCount", { count: 0 }), "V košíku je 0 položek");
expect(i18next.t("cartCount", { count: 1 }), "V košíku je 1 položka");
expect(i18next.t("cartCount", { count: 2 }), "V košíku jsou 2 položky");
expect(i18next.t("cartCount", { count: 4 }), "V košíku jsou 4 položky");
expect(i18next.t("cartCount", { count: 5 }), "V košíku je 5 položek");
expect(i18next.t("saleDays", { count: 1 }), "Sleva končí za 1 den.");
expect(i18next.t("saleDays", { count: 3 }), "Sleva končí za 3 dny.");
expect(i18next.t("saleDays", { count: 5 }), "Sleva končí za 5 dní.");
expect(
  i18next.t("total", { total: 420, ...currency }),
  `Celkem ${new Intl.NumberFormat("cs", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(420)}`,
);
expect(
  i18next.t("delivery", dated),
  `Doručíme ${new Intl.DateTimeFormat("cs", { dateStyle: "long" }).format(dated.date)}.`,
);
expect(i18next.t("products.cup.name"), "Hrnek");

await i18next.changeLanguage("pl");
expect(i18next.t("greeting", { firstName: "Anna" }), "Dzień dobry, Anna");
expect(i18next.t("cartCount", { count: 0 }), "W koszyku jest 0 produktów");
expect(i18next.t("cartCount", { count: 1 }), "W koszyku jest 1 produkt");
expect(i18next.t("cartCount", { count: 3 }), "W koszyku są 3 produkty");
expect(i18next.t("cartCount", { count: 5 }), "W koszyku jest 5 produktów");
expect(i18next.t("cartCount", { count: 12 }), "W koszyku jest 12 produktów");
expect(i18next.t("cartCount", { count: 22 }), "W koszyku są 22 produkty");
expect(i18next.t("saleDays", { count: 1 }), "Wyprzedaż kończy się za 1 dzień.");
expect(i18next.t("saleDays", { count: 3 }), "Wyprzedaż kończy się za 3 dni.");
expect(i18next.t("saleDays", { count: 5 }), "Wyprzedaż kończy się za 5 dni.");
expect(
  i18next.t("total", { total: 420, ...currency }),
  `Razem ${new Intl.NumberFormat("pl", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(420)}`,
);
expect(
  i18next.t("delivery", dated),
  `Dostarczymy ${new Intl.DateTimeFormat("pl", { dateStyle: "long" }).format(dated.date)}.`,
);
expect(i18next.t("products.cup.name"), "Kubek");

if (failures.length > 0) {
  console.error(failures.join("\n\n"));
  process.exit(1);
}

console.log("cs and pl locale strings match plural, currency, and date rules");
