export const products = [
  { id: "cup", price: 420, swatch: "#9eb8ae" },
  { id: "cloth", price: 260, swatch: "#c4a882" },
  { id: "candle", price: 190, swatch: "#d7a441" },
  { id: "notebook", price: 310, swatch: "#24312b" },
] as const;

export type ProductId = (typeof products)[number]["id"];

export const shopper = {
  firstName: "Anna",
};

/** Five days from today, so the sale notice always has a live plural. */
export const saleDaysLeft = 5;

export function deliveryDate(from = new Date()): Date {
  const date = new Date(from);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + 3);
  return date;
}
