import type { OrderItem, RedemptionStatus } from "@/types";

/** A line counts as collected when it is marked so — for a book set, when every item in it is. */
export function isLineCollected(item: Pick<OrderItem, "collectedAt" | "parts">): boolean {
  if (item.parts && item.parts.length > 0) return item.parts.every((part) => part.collectedAt);
  return Boolean(item.collectedAt);
}

/** Part of a line has been handed over, but not all of it. */
export function isLinePartlyCollected(item: Pick<OrderItem, "collectedAt" | "parts">): boolean {
  if (!item.parts || item.parts.length === 0) return false;
  const done = item.parts.filter((part) => part.collectedAt).length;
  return done > 0 && done < item.parts.length;
}

/**
 * Rolls per-item `collectedAt` state up into the single status a Receipt
 * stores — used by the Orders `afterChange` hook whenever items change, so
 * every existing renderer that just reads `receipt.redemptionStatus`
 * (StatusBadge, the Payments filter, etc.) keeps working unmodified.
 * A book set with only some of its items handed over makes the receipt
 * "partially-collected". Program check-in ("checked-in") is a different,
 * whole-receipt-only path and never computed here — see scan/page.tsx's
 * isTicketRecord().
 */
export function deriveRedemptionStatus(items: OrderItem[]): Extract<RedemptionStatus, "ready" | "partially-collected" | "collected"> {
  const collectedCount = items.filter(isLineCollected).length;
  if (collectedCount === items.length) return "collected";
  if (collectedCount > 0 || items.some(isLinePartlyCollected)) return "partially-collected";
  // Nothing fully collected and nothing partly — but a book set may have a part or two.
  return "ready";
}
