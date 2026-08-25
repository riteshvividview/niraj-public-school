import type { OrderItem, RedemptionStatus } from "@/types";

/**
 * Rolls per-item `collectedAt` state up into the single status a Receipt
 * stores — used by the Orders `afterChange` hook whenever items change, so
 * every existing renderer that just reads `receipt.redemptionStatus`
 * (StatusBadge, the Payments filter, etc.) keeps working unmodified.
 * Program check-in ("checked-in") is a different, whole-receipt-only path
 * and never computed here — see scan/page.tsx's isTicketRecord().
 */
export function deriveRedemptionStatus(items: OrderItem[]): Extract<RedemptionStatus, "ready" | "partially-collected" | "collected"> {
  const collectedCount = items.filter((item) => item.collectedAt).length;
  if (collectedCount === 0) return "ready";
  if (collectedCount === items.length) return "collected";
  return "partially-collected";
}
