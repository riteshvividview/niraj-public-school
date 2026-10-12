import { isLineCollected, isLinePartlyCollected } from "@/lib/order-items";
import type { OrderItem } from "@/types";

/**
 * For spreadsheets: where an order line stands on collection — and, for a book set, which of its
 * items are still to be handed over. Programs aren't collected (they're checked in), so they say so.
 */
export function collectionStatusText(item: OrderItem): string {
  if (item.kind === "program") return "n/a (program)";
  const parts = item.parts ?? [];
  if (parts.length > 0) {
    const done = parts.filter((part) => part.collectedAt).length;
    if (done === parts.length) return `Collected (${done} of ${parts.length})`;
    const pending = parts.filter((part) => !part.collectedAt).map((part) => part.name);
    return `${isLinePartlyCollected(item) ? "Partially collected" : "Not collected"} (${done} of ${parts.length}); still to hand over: ${pending.join("; ")}`;
  }
  return isLineCollected(item) ? "Collected" : "Not collected";
}
