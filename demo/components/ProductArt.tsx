import type { ReactNode } from "react";
import type { ProductId } from "@/lib/catalog";

const shapes: Record<ProductId, ReactNode> = {
  cup: (
    <>
      <path d="M44 32h30v24a10 10 0 0 1-10 10H54a10 10 0 0 1-10-10z" />
      <path
        d="M74 37h3a8 8 0 0 1 0 16h-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
      />
    </>
  ),
  cloth: (
    <>
      <path
        d="M54 22a6 6 0 0 1 12 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <rect x="43" y="21" width="34" height="50" rx="2" />
      <rect x="43" y="56" width="34" height="2.5" fill="#fff" opacity="0.5" />
      <rect x="43" y="61" width="34" height="2.5" fill="#fff" opacity="0.5" />
    </>
  ),
  candle: (
    <>
      <path d="M60 14c4.5 6 6 9.5 6 12.5a6 6 0 0 1-12 0c0-3 1.5-6.5 6-12.5z" />
      <rect x="59" y="32" width="2" height="6" />
      <rect x="47" y="38" width="26" height="32" rx="3" />
    </>
  ),
  notebook: (
    <>
      <rect x="40" y="20" width="40" height="50" rx="3" />
      <rect x="70" y="20" width="3" height="50" fill="#fff" opacity="0.35" />
      <rect x="46" y="32" width="18" height="2" fill="#fff" opacity="0.3" />
      <rect x="46" y="38" width="14" height="2" fill="#fff" opacity="0.3" />
    </>
  ),
};

export function ProductArt({ id }: { id: ProductId }) {
  return (
    <svg
      viewBox="0 0 120 84"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {shapes[id]}
    </svg>
  );
}
