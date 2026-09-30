"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import {
  deliveryDate,
  initialSaleDays,
  products,
  saleEndDate,
  shopper,
  type ProductId,
} from "@/lib/catalog";
import { currencyFormat, dateFormat } from "@/lib/i18n";
import { vocativeFirstName } from "@/lib/vocative";
import { ProductArt } from "./ProductArt";

const languages = ["cs", "pl"] as const;
const nameSuggestions = ["Petr", "Jana", "Tomáš"] as const;

type Cart = Partial<Record<ProductId, number>>;

export function Shop() {
  const { t, i18n } = useTranslation("translation", { useSuspense: false });
  const [cart, setCart] = useState<Cart>({});
  const [saleDays, setSaleDays] = useState(initialSaleDays);
  const [firstName, setFirstName] = useState(shopper.firstName);
  const language = i18n.resolvedLanguage ?? "cs";

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t("shopName");
  }, [language, t]);

  const deliveredOn = useMemo(() => deliveryDate(), []);
  const saleEnds = useMemo(() => saleEndDate(saleDays), [saleDays]);
  const itemCount = Object.values(cart).reduce<number>(
    (sum, quantity) => sum + (quantity ?? 0),
    0,
  );
  const lines = products.flatMap((product) => {
    const quantity = cart[product.id] ?? 0;
    return quantity > 0 ? [{ ...product, quantity }] : [];
  });
  const total = lines.reduce(
    (sum, line) => sum + line.price * line.quantity,
    0,
  );

  function add(id: ProductId) {
    setCart((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
  }

  function remove(id: ProductId) {
    setCart((current) => {
      const nextQuantity = (current[id] ?? 0) - 1;
      const next = { ...current };
      if (nextQuantity <= 0) delete next[id];
      else next[id] = nextQuantity;
      return next;
    });
  }

  return (
    <div className="shell">
      <header className="header">
        <div className="identity">
          <h1>{t("shopName")}</h1>
          <div className="greet">
            <p className="greeting">
              {t("greeting", {
                firstName,
                firstNameVocative: vocativeFirstName(firstName),
              })}
            </p>
            <div className="name-field">
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                aria-label={language === "pl" ? "Imię" : "Jméno"}
                autoComplete="given-name"
                spellCheck={false}
              />
              <div className="name-picks">
                {nameSuggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={firstName === name}
                    onClick={() => setFirstName(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="tools">
          <nav className="languages" aria-label={t("language")}>
            {languages.map((lng) => (
              <button
                key={lng}
                type="button"
                aria-pressed={language === lng}
                onClick={() => {
                  void i18n.changeLanguage(lng);
                }}
              >
                {t(lng === "cs" ? "langCs" : "langPl")}
              </button>
            ))}
          </nav>
          <a className="cart-count" href="#summary-title" aria-live="polite">
            <span key={itemCount} className="cart-badge" aria-hidden="true">
              {itemCount}
            </span>
            {t("cartCount", { count: itemCount })}
          </a>
        </div>
      </header>

      <div className="sale-panel">
        <div className="sale-text">
          <p className="sale" role="status">
            {t("saleDays", { count: saleDays })}
          </p>
          <p className="sale-date">
            {t("saleDate", {
              date: saleEnds,
              formatParams: { date: dateFormat },
            })}
          </p>
        </div>
        <div className="sale-adjust">
          <button
            type="button"
            onClick={() => setSaleDays((days) => Math.max(0, days - 1))}
            disabled={saleDays === 0}
          >
            {t("saleEarlier")}
          </button>
          <button
            type="button"
            onClick={() => setSaleDays((days) => days + 1)}
          >
            {t("saleLater")}
          </button>
        </div>
      </div>

      <div className="columns">
        <section aria-labelledby="products-title">
          <h2 id="products-title">{t("productsTitle")}</h2>
          <ul className="products">
            {products.map((product) => {
              const name = t(`products.${product.id}.name`);
              const quantity = cart[product.id] ?? 0;
              return (
                <li
                  key={product.id}
                  className="product"
                  style={{ "--swatch": product.swatch } as CSSProperties}
                >
                  <div className="art">
                    <ProductArt id={product.id} />
                    {quantity > 0 && (
                      <span className="in-cart" aria-hidden="true">
                        {t("pieces", { count: quantity })}
                      </span>
                    )}
                  </div>
                  <div className="product-body">
                    <div>
                      <h3>{name}</h3>
                      <p className="detail">
                        {t(`products.${product.id}.detail`)}
                      </p>
                    </div>
                    <p className="price">
                      {t("price", {
                        price: product.price,
                        formatParams: { price: currencyFormat },
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="add"
                    onClick={() => add(product.id)}
                    aria-label={t("addNamed", { name })}
                  >
                    {t("add")}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="summary" aria-labelledby="summary-title">
          <h2 id="summary-title">{t("summaryTitle")}</h2>
          {lines.length === 0 ? (
            <p className="empty">{t("emptyCart")}</p>
          ) : (
            <ul className="lines">
              {lines.map((line) => {
                const name = t(`products.${line.id}.name`);
                return (
                  <li key={line.id} className="line">
                    <span
                      className="line-dot"
                      style={{ background: line.swatch }}
                      aria-hidden="true"
                    />
                    <div className="line-main">
                      <span className="line-name">{name}</span>
                      <span className="pieces">
                        {t("pieces", { count: line.quantity })}
                      </span>
                    </div>
                    <div className="line-end">
                      <span className="line-price">
                        {t("price", {
                          price: line.price * line.quantity,
                          formatParams: { price: currencyFormat },
                        })}
                      </span>
                      <button
                        type="button"
                        className="remove"
                        onClick={() => remove(line.id)}
                        aria-label={t("removeNamed", { name })}
                      >
                        {t("remove")}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="checkout">
            <p className="total" aria-live="polite">
              {t("total", {
                total,
                formatParams: { total: currencyFormat },
              })}
            </p>
            <p className="delivery">
              {t("delivery", {
                date: deliveredOn,
                formatParams: { date: dateFormat },
              })}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
