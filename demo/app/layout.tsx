import type { Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import cs from "../locales/cs.json";
import "./globals.css";

const schibsted = Schibsted_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-schibsted",
});

export const metadata: Metadata = {
  title: cs.shopName,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="cs" className={schibsted.variable}>
      <body>{children}</body>
    </html>
  );
}
