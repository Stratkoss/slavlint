import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import cs from "../locales/cs.json";
import pl from "../locales/pl.json";

export const currencyFormat = {
  currency: "CZK",
  maximumFractionDigits: 0,
} as const;

export const dateFormat = {
  dateStyle: "long",
} as const;

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      cs: { translation: cs },
      pl: { translation: pl },
    },
    lng: "cs",
    fallbackLng: "cs",
    supportedLngs: ["cs", "pl"],
    interpolation: { escapeValue: false },
  });
}

export default i18n;
