import { lineId } from "@/store/cart-store";
import type { Book, CartItem, ReceiptRecord, UniformItem } from "@/types";

/**
 * Book/UniformItem -> CartItem mappers, shared by the essentials hub and
 * its sub-pages so "what a cart line looks like for this catalogue item"
 * is defined once.
 */
/**
 * `variantLabels` carries the student's chosen 2nd language/specialization/
 * specialization 2 (see the essentials/books selection step) onto the cart
 * line's `meta`, so it surfaces automatically everywhere a CartItem is
 * already rendered — cart, ReceiptCard (receipts, console Scan, console
 * Student Detail) — without any new fields elsewhere.
 */
export function bookToCartItem(book: Book, variantLabels: string[] = []): CartItem {
  const meta = [book.subject, ...variantLabels].filter(Boolean).join(" · ");
  return {
    id: lineId("book", book.id),
    kind: "book",
    refId: book.id,
    label: book.title,
    meta,
    unitPrice: book.price,
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
    programs: items.filter((item) => item.kind === "program"),
  };
}

export function subtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

/** PriceSummary-ready {label, amount} lines, one per non-empty category. */
export function buildPriceSummaryLines(
  items: CartItem[],
  labels: { books: string; uniform: string; programs: string },
) {
  const grouped = groupItemsByKind(items);
  return (
    [
      { key: "books", label: labels.books, items: grouped.books },
      { key: "uniform", label: labels.uniform, items: grouped.uniform },
      { key: "programs", label: labels.programs, items: grouped.programs },
    ] as const
  )
    .filter((group) => group.items.length > 0)
    .map((group) => ({ label: group.label, amount: subtotal(group.items) }));
}

export interface ReceiptTitleLabels {
  /** Short nouns for composing a title, e.g. "Books" — distinct from essentials.uniform ("Uniform & Kit"), which reads awkwardly once joined with "&". */
  books: string;
  uniform: string;
  /** "Receipt" */
  receiptWord: string;
  /** "Programme Receipt" */
  programmeReceiptWord: string;
}

function joinWithAnd(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} & ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")} & ${parts[parts.length - 1]}`;
}

/**
 * A receipt's title reflects what's actually in the order, not the generic
 * school name — "Books Receipt", "Books & Uniform Receipt", or for an
 * order that's purely a program enrollment, "Programme Receipt — <title>"
 * (using the single program's own name; falls back to the plain word for
 * the rare multi-program order).
 */
export function deriveReceiptTitle(items: CartItem[], labels: ReceiptTitleLabels): string {
  const grouped = groupItemsByKind(items);
  const essentialParts = [
    grouped.books.length > 0 && labels.books,
    grouped.uniform.length > 0 && labels.uniform,
  ].filter((part): part is string => Boolean(part));
  const hasPrograms = grouped.programs.length > 0;

  if (hasPrograms && essentialParts.length === 0) {
    return grouped.programs.length === 1
      ? `${labels.programmeReceiptWord} — ${grouped.programs[0].label}`
      : labels.programmeReceiptWord;
  }

  const essentialsTitle = joinWithAnd(essentialParts);
  return hasPrograms
    ? `${essentialsTitle} & ${labels.programmeReceiptWord}`
    : `${essentialsTitle} ${labels.receiptWord}`;
}

/** Program ids a student already has a receipt for (any redemption status) — used to show "Registered" instead of letting them enroll twice. */
export function registeredProgramIds(records: ReceiptRecord[]): Set<string> {
  const ids = new Set<string>();
  records.forEach((record) =>
    record.order.items.forEach((item) => {
      if (item.kind === "program") ids.add(item.refId);
    }),
  );
  return ids;
}
