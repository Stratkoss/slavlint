import type { Metadata } from "next";
import { Figtree, Literata } from "next/font/google";
import cs from "../locales/cs.json";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin", "latin-ext"],
  variable: "--font-figtree",
});

const literata = Literata({
  subsets: ["latin", "latin-ext"],
  variable: "--font-literata",
});

export const metadata: Metadata = {
  title: cs.shopName,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="cs" className={`${figtree.variable} ${literata.variable}`}>
      <body>{children}</body>
    </html>
  );
}
