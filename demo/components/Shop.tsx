"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  deliveryDate,
  products,
  saleDaysLeft,
  shopper,
  type ProductId,
} from "@/lib/catalog";
import { currencyFormat, dateFormat } from "@/lib/i18n";

const languages = ["cs", "pl"] as const;

type Cart = Partial<Record<ProductId, number>>;

export function Shop() {
  const { t, i18n } = useTranslation("translation", { useSuspense: false });
  const [cart, setCart] = useState<Cart>({});
  const language = i18n.resolvedLanguage ?? "cs";

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t("shopName");
  }, [language, t]);

  const deliveredOn = useMemo(() => deliveryDate(), []);
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
          <p className="greeting">
            {t("greeting", { firstName: shopper.firstName })}
          </p>
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
          <p className="cart-count" aria-live="polite">
            {t("cartCount", { count: itemCount })}
          </p>
        </div>
      </header>

      <p className="sale" role="status">
        {t("saleDays", { count: saleDaysLeft })}
      </p>

      <div className="columns">
        <section aria-labelledby="products-title">
          <h2 id="products-title">{t("productsTitle")}</h2>
          <ul className="products">
            {products.map((product) => {
              const name = t(`products.${product.id}.name`);
              return (
                <li key={product.id} className="product">
                  <span
                    className="swatch"
                    style={{ background: product.swatch }}
                    aria-hidden="true"
                  />
                  <div>
                    <h3>{name}</h3>
                    <p className="detail">{t(`products.${product.id}.detail`)}</p>
                  </div>
                  <div className="buy">
                    <p className="price">
                      {t("price", {
                        price: product.price,
                        formatParams: { price: currencyFormat },
                      })}
                    </p>
                    <button
                      type="button"
                      className="add"
                      onClick={() => add(product.id)}
                      aria-label={t("addNamed", { name })}
                    >
                      {t("add")}
                    </button>
                  </div>
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
                    <span>{name}</span>
                    <span className="pieces">
                      {t("pieces", { count: line.quantity })}
                    </span>
                    <button
                      type="button"
                      className="remove"
                      onClick={() => remove(line.id)}
                      aria-label={t("removeNamed", { name })}
                    >
                      {t("remove")}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
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
        </aside>
      </div>
    </div>
  );
}
