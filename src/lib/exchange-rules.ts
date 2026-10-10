import type { ExchangeStatus, Order, OrderItem } from "@/types";

/**
 * Shared by the student Exchange tab (UI eligibility messaging) and the
 * server routes (src/app/(payload)/api/exchange/*) that actually enforce
 * it — one definition, so the screen can never promise something the
 * server then refuses.
 */

/** How long after an item was collected at the counter a parent may still request an exchange. */
export const EXCHANGE_WINDOW_DAYS = 14;
export const EXCHANGE_NOTE_MAX = 300;
export const EXCHANGE_STAFF_NOTE_MIN = 3;

/** Requests in these states hold the item — a second request for the same order line is blocked while one is open. */
export const ACTIVE_EXCHANGE_STATUSES: ExchangeStatus[] = ["pending", "approved"];

export const EXCHANGE_REASONS = ["size-too-small", "size-too-large", "defect", "other"] as const;
export type ExchangeReasonValue = (typeof EXCHANGE_REASONS)[number];

export type ExchangeIneligibleReason =
  | "not-uniform"
  | "not-paid"
  | "not-collected"
  | "window-closed"
  | "already-requested"
  | "already-exchanged"
  | "no-sizes";

export type ExchangeEligibility =
  | { eligible: true; deadline: string }
  | { eligible: false; reason: ExchangeIneligibleReason; deadline?: string };

export function exchangeDeadline(collectedAt: string): string {
  return new Date(new Date(collectedAt).getTime() + EXCHANGE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/** Whole days left in the window (rounded up), never negative. */
export function exchangeDaysLeft(deadline: string, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
}

/**
 * Can this order line be exchanged right now?
 * `activeRequestItemIds` = order-item ids with a pending/approved request;
 * `exchangedItemIds` = order-item ids that already had a COMPLETED exchange.
 * After a completed exchange the order line still records the original size,
 * so a line can be exchanged online only once — anything further is handled
 * by staff at the counter.
 */
export function getExchangeEligibility(
  item: OrderItem,
  order: Pick<Order, "status">,
  activeRequestItemIds: Set<string>,
  exchangedItemIds: Set<string> = new Set(),
  now: Date = new Date(),
): ExchangeEligibility {
  if (item.kind !== "uniform") return { eligible: false, reason: "not-uniform" };
  if (order.status !== "paid") return { eligible: false, reason: "not-paid" };
  if (!item.collectedAt) return { eligible: false, reason: "not-collected" };
  if (exchangedItemIds.has(item.id)) return { eligible: false, reason: "already-exchanged" };
  const deadline = exchangeDeadline(item.collectedAt);
  if (new Date(deadline).getTime() < now.getTime()) return { eligible: false, reason: "window-closed", deadline };
  if (activeRequestItemIds.has(item.id)) return { eligible: false, reason: "already-requested", deadline };
  return { eligible: true, deadline };
}

/** `unitPrice` difference × quantity — positive means the parent owes the school, negative means the school owes the parent. */
export function exchangePriceDifference(fromUnitPrice: number, toUnitPrice: number, quantity: number): number {
  return (toUnitPrice - fromUnitPrice) * quantity;
}

/** Stock lookup key for a uniform size — mirrors Receipts.ts's `variantKey = item.meta` for uniforms. */
export function uniformStockKey(sizeLabel: string): string {
  return sizeLabel;
}
