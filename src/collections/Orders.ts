import type { CollectionAfterChangeHook, CollectionConfig } from "payload";
import { authenticated } from "../access/authenticated";
import { collectedEmail } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/brevo";
import { deriveRedemptionStatus } from "@/lib/order-items";
import type { OrderItem } from "@/types";

interface OrderItemRow {
  id: string;
  kind: string;
  refId: string;
  label: string;
  meta?: string | null;
  unitPrice: number;
  quantity: number;
  collectedAt?: string | null;
}

function toOrderItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    kind: row.kind as OrderItem["kind"],
    refId: row.refId,
    label: row.label,
    meta: row.meta ?? undefined,
    unitPrice: row.unitPrice,
    quantity: row.quantity,
    collectedAt: row.collectedAt ?? null,
  };
}

/**
 * Fires when staff mark item(s) collected at the counter (see
 * markOrderItemsCollected in src/lib/data-source/orders.ts). Diffs
 * previousDoc vs doc by row id to find items whose collectedAt just
 * transitioned unset -> set (an undo, set -> unset, is a staff correction —
 * no email, but the rollup status still needs to reflect it), rolls the
 * current state up into the linked Receipt's redemptionStatus, and emails
 * the student just the newly-collected items (plus what's still pending)
 * — not the whole receipt again. Program check-in ("checked-in") is a
 * separate, whole-receipt-only path (markReceiptRedeemed) and untouched by
 * this hook.
 */
const notifyOnCollection: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  if (operation !== "update" || !previousDoc) return doc;

  const items: OrderItemRow[] = doc.items ?? [];
  const prevItems: OrderItemRow[] = previousDoc.items ?? [];
  const prevCollectedAt = new Map(prevItems.map((item) => [item.id, item.collectedAt ?? null]));
  const changed = items.filter((item) => (item.collectedAt ?? null) !== prevCollectedAt.get(item.id));
  if (changed.length === 0) return doc;
  const justCollected = changed.filter((item) => item.collectedAt);

  const orderItems = items.map(toOrderItem);
  const status = deriveRedemptionStatus(orderItems);

  const receiptsResult = await req.payload.find({
    collection: "receipts",
    where: { order: { equals: doc.id } },
    limit: 1,
  });
  const receiptDoc = receiptsResult.docs[0];
  if (!receiptDoc || receiptDoc.redemptionStatus === "checked-in") return doc;

  await req.payload.update({
    collection: "receipts",
    id: receiptDoc.id,
    data: { redemptionStatus: status, redeemedAt: new Date().toISOString() },
  });

  if (justCollected.length === 0) return doc;

  const userId = typeof doc.user === "string" ? doc.user : doc.user?.id;
  const user = userId ? await req.payload.findByID({ collection: "users", id: userId }) : null;
  if (user?.email) {
    const stillPending = orderItems.filter((item) => !item.collectedAt);
    await sendTransactionalEmail({
      to: user.email,
      toName: user.name,
      subject: status === "collected" ? "All items collected" : "Items collected",
      html: collectedEmail({
        receiptCode: receiptDoc.qrPayload,
        justCollectedItems: justCollected.map(toOrderItem),
        stillPendingItems: stillPending,
      }),
    });
  }

  return doc;
};

/** Mirrors src/types/order.ts Order. Real write path for checkout — see src/lib/data-source/orders.ts. */
export const Orders: CollectionConfig = {
  slug: "orders",
  // Read/update/delete open — same known gap as every other console-writable
  // collection (see Books.ts): the console's staff session is still a mock,
  // not a real Payload session, so Reports/Scanner REST calls carry no auth
  // cookie. `create` stays real-auth-only because the parent/student Users
  // collection *does* have a real Payload session (payloadLogin sets an
  // actual cookie) — that's free, meaningful protection against forging an
  // order as someone else, so there's no reason to loosen it too.
  access: { read: () => true, create: authenticated, update: () => true, delete: () => true },
  hooks: { afterChange: [notifyOnCollection] },
  fields: [
    { name: "user", type: "relationship", relationTo: "users", required: true },
    { name: "school", type: "relationship", relationTo: "schools", required: true },
    {
      name: "items",
      type: "array",
      required: true,
      minRows: 1,
      fields: [
        { name: "kind", type: "select", required: true, options: ["book", "uniform", "program"] },
        { name: "refId", type: "text", required: true },
        { name: "label", type: "text", required: true },
        { name: "meta", type: "text" },
        { name: "unitPrice", type: "number", required: true },
        { name: "quantity", type: "number", required: true },
        // Set per-item at the counter (see markOrderItemsCollected) —
        // unset means "not yet collected". Program items never use this;
        // program attendance stays a whole-receipt "checked-in" mark.
        { name: "collectedAt", type: "date" },
      ],
    },
    { name: "totalAmount", type: "number", required: true },
    {
      name: "paymentMethod",
      type: "select",
      required: true,
      options: ["upi", "card", "netbanking"],
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "paid",
      options: ["paid", "pending", "failed", "refunded"],
    },
  ],
};
