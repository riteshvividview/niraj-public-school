import type { CollectionAfterChangeHook, CollectionConfig, Payload } from "payload";
import { denyAll, readOwnOrStaff, staffOnly } from "../access/request-access";
import { actorFromUser, recordEvent } from "@/lib/server/record-events";
import { readyToCollectEmail } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/brevo";

interface ReceiptOrderItem {
  kind: string;
  refId: string;
  meta?: string | null;
  quantity: number;
}

/**
 * Decrements EssentialsStock for every book/uniform line on the order —
 * fires exactly once per receipt (this hook only runs on `create`), which is
 * what the school asked for: stock reduces the moment a student pays, not
 * when they later collect at the counter. Programs are never stock-tracked.
 * Silently skips a line if no stock row exists yet for that product —
 * staff opt a product into tracking by giving it an initial count in the
 * Stock tab; until then we don't fabricate a row.
 */
async function decrementEssentialsStock(
  schoolId: string,
  items: ReceiptOrderItem[],
  payload: Payload,
): Promise<void> {
  for (const item of items) {
    if (item.kind !== "book" && item.kind !== "uniform") continue;
    const variantKey = item.kind === "uniform" ? (item.meta ?? "") : "";

    // One atomic statement: two payments at the same moment both subtract, neither overwrites the other.
    // A product with no stock row yet is simply not tracked (zero rows updated).
    const pool = (payload.db as unknown as { pool: { query: (text: string, values?: unknown[]) => Promise<unknown> } }).pool;
    await pool.query(
      `UPDATE essentials_stock SET quantity_on_hand = quantity_on_hand - $5, updated_at = now()
        WHERE school_id = $1 AND kind = $2 AND ref_id = $3 AND variant_key = $4`,
      [schoolId, item.kind, item.refId, variantKey, item.quantity],
    );
  }
}

/** Fires once, right when a receipt is first issued (redemptionStatus "ready") — see createReceiptForOrder. */
const notifyReadyToCollect: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== "create" || doc.redemptionStatus !== "ready") return doc;

  const orderId = typeof doc.order === "string" ? doc.order : doc.order?.id;
  const userId = typeof doc.user === "string" ? doc.user : doc.user?.id;
  if (!orderId || !userId) return doc;

  const [order, user] = await Promise.all([
    req.payload.findByID({ collection: "orders", id: orderId }),
    req.payload.findByID({ collection: "users", id: userId }),
  ]);
  if (!order) return doc;

  const schoolId = typeof doc.school === "string" ? doc.school : doc.school?.id;
  if (schoolId) {
    await decrementEssentialsStock(schoolId, order.items ?? [], req.payload);
  }

  if (!user?.email) return doc;

  await sendTransactionalEmail({
    to: user.email,
    toName: user.name,
    subject: "Your order is ready to collect",
    html: readyToCollectEmail({ receiptCode: doc.qrPayload, items: order.items ?? [], total: order.totalAmount }),
  });

  return doc;
};

/** Permanent activity log: receipt issued, and every change of its collection status. */
const logReceiptHistory: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  const studentId = typeof doc.user === "string" ? doc.user : doc.user?.id;
  const schoolId = typeof doc.school === "string" ? doc.school : doc.school?.id;
  if (!studentId || !schoolId) return doc;

  if (operation === "create") {
    await recordEvent(req.payload, {
      eventType: "receipt.issued",
      entityType: "receipt",
      entityId: String(doc.id),
      schoolId,
      studentId,
      receiptCode: doc.qrPayload,
      actor: actorFromUser(req.user),
      summary: `Receipt ${doc.qrPayload} issued`,
      details: { orderId: typeof doc.order === "string" ? doc.order : doc.order?.id, redemptionStatus: doc.redemptionStatus },
    });
  } else if (operation === "update" && previousDoc && previousDoc.redemptionStatus !== doc.redemptionStatus) {
    await recordEvent(req.payload, {
      eventType: "receipt.status_changed",
      entityType: "receipt",
      entityId: String(doc.id),
      schoolId,
      studentId,
      receiptCode: doc.qrPayload,
      actor: actorFromUser(req.user),
      summary: `Receipt ${doc.qrPayload}: ${previousDoc.redemptionStatus} → ${doc.redemptionStatus}`,
      details: { from: previousDoc.redemptionStatus, to: doc.redemptionStatus },
    });
  }
  return doc;
};

/** Mirrors src/types/receipt.ts Receipt. Real write path for checkout — see src/lib/data-source/receipts.ts. */
export const Receipts: CollectionConfig = {
  slug: "receipts",
  // See Orders.ts's comment — receipts are permanent records too.
  access: { read: readOwnOrStaff, create: denyAll, update: staffOnly, delete: denyAll },
  hooks: { afterChange: [logReceiptHistory, notifyReadyToCollect] },
  fields: [
    { name: "order", type: "relationship", relationTo: "orders", required: true },
    { name: "user", type: "relationship", relationTo: "users", required: true },
    { name: "school", type: "relationship", relationTo: "schools", required: true },
    { name: "qrPayload", type: "text", required: true },
    {
      name: "redemptionStatus",
      type: "select",
      required: true,
      defaultValue: "ready",
      options: ["ready", "partially-collected", "collected", "checked-in"],
    },
    { name: "issuedAt", type: "date", required: true },
    { name: "redeemedAt", type: "date" },
  ],
};
