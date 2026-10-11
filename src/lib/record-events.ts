/**
 * Shared vocabulary for the activity log: which categories exist (the
 * console's filter), and a readable label for each event type.
 */
export type RecordEventCategory = "orders" | "collection" | "exchange" | "subject" | "support" | "profile";

export const RECORD_EVENT_CATEGORIES: Array<{ value: RecordEventCategory; label: string }> = [
  { value: "orders", label: "Orders & receipts" },
  { value: "collection", label: "Collection at counter" },
  { value: "exchange", label: "Exchanges" },
  { value: "subject", label: "Subject changes" },
  { value: "support", label: "Parent support" },
  { value: "profile", label: "Profile / address" },
];

export function categoryOfEvent(eventType: string): RecordEventCategory {
  if (eventType.startsWith("item.")) return "collection";
  if (eventType.startsWith("exchange.")) return "exchange";
  if (eventType.startsWith("bookchange.")) return "subject";
  if (eventType.startsWith("support.")) return "support";
  if (eventType.startsWith("profile.")) return "profile";
  return "orders";
}

/** Event-type prefixes for each category — used to build the server-side filter. */
export const CATEGORY_PREFIXES: Record<RecordEventCategory, string[]> = {
  orders: ["order.", "receipt.", "payment."],
  collection: ["item."],
  exchange: ["exchange."],
  subject: ["bookchange."],
  support: ["support."],
  profile: ["profile."],
};

const LABELS: Record<string, string> = {
  "payment.started": "Payment started",
  "payment.paid": "Payment confirmed",
  "payment.failed": "Payment failed",
  "payment.cancelled": "Payment cancelled",
  "payment.expired": "Payment timed out",
  "payment.flagged": "Payment needs review",
  "order.created": "Order placed",
  "receipt.issued": "Receipt issued",
  "receipt.status_changed": "Receipt status changed",
  "item.collected": "Item collected",
  "item.uncollected": "Collection undone",
  "exchange.requested": "Exchange requested",
  "exchange.approved": "Exchange approved",
  "exchange.rejected": "Exchange rejected",
  "exchange.cancelled": "Exchange cancelled",
  "exchange.completed": "Exchange completed",
  "bookchange.requested": "Subject change requested",
  "bookchange.approved": "Subject change approved",
  "bookchange.rejected": "Subject change rejected",
  "bookchange.cancelled": "Subject change cancelled",
  "support.requested": "Support query sent",
  "support.started": "Support query picked up",
  "support.resolved": "Support query resolved",
  "support.reopened": "Support query reopened",
  "profile.address_updated": "Address saved",
  "profile.address_removed": "Address removed",
};

export function eventLabel(eventType: string): string {
  return LABELS[eventType] ?? eventType;
}
