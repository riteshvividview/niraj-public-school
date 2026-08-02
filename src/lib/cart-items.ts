import { lineId } from "@/store/cart-store";
import type { Book, CartItem, StationeryItem, UniformItem } from "@/types";

/**
 * Book/StationeryItem/UniformItem -> CartItem mappers, shared by the
 * essentials hub and its three sub-pages so "what a cart line looks like
 * for this catalogue item" is defined once.
 */
export function bookToCartItem(book: Book): CartItem {
  return {
    id: lineId("book", book.id),
    kind: "book",
    refId: book.id,
    label: book.title,
    meta: book.subject,
    unitPrice: book.price,
    quantity: 1,
  };
}

export function stationeryToCartItem(item: StationeryItem): CartItem {
  return {
    id: lineId("stationery", item.id),
    kind: "stationery",
    refId: item.id,
    label: item.name,
    meta: item.quantityLabel,
    unitPrice: item.price,
    quantity: 1,
  };
}

export function uniformToCartItem(item: UniformItem, size: string, price: number): CartItem {
  return {
    id: lineId("uniform", item.id),
    kind: "uniform",
    refId: item.id,
    label: item.name,
    meta: size,
    unitPrice: price,
    quantity: 1,
  };
}

/** Groups cart/order lines by category — used by Cart's breakdown and the receipt summary. */
export function groupItemsByKind(items: CartItem[]) {
  return {
    books: items.filter((item) => item.kind === "book"),
    uniform: items.filter((item) => item.kind === "uniform"),
    stationery: items.filter((item) => item.kind === "stationery"),
    programs: items.filter((item) => item.kind === "program"),
  };
}

export function subtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

/** PriceSummary-ready {label, amount} lines, one per non-empty category. */
export function buildPriceSummaryLines(
  items: CartItem[],
  labels: { books: string; uniform: string; stationery: string; programs: string },
) {
  const grouped = groupItemsByKind(items);
  return (
    [
      { key: "books", label: labels.books, items: grouped.books },
      { key: "uniform", label: labels.uniform, items: grouped.uniform },
      { key: "stationery", label: labels.stationery, items: grouped.stationery },
      { key: "programs", label: labels.programs, items: grouped.programs },
    ] as const
  )
    .filter((group) => group.items.length > 0)
    .map((group) => ({ label: group.label, amount: subtotal(group.items) }));
}

/** Short human-readable lines for a ReceiptCard — one line per uniform/program item, one summary line for books/stationery. */
export function summarizeOrderItems(
  items: CartItem[],
  labels: { books: string; stationery: string },
): string[] {
  const grouped = groupItemsByKind(items);
  const lines: string[] = [];
  if (grouped.books.length > 0) lines.push(`${labels.books} (${grouped.books.length})`);
  grouped.uniform.forEach((item) => lines.push(`${item.label} — ${item.meta ?? ""}`));
  if (grouped.stationery.length > 0) lines.push(`${labels.stationery} (${grouped.stationery.length})`);
  grouped.programs.forEach((item) => lines.push(item.label));
  return lines;
}
