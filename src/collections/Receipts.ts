import type { CollectionAfterChangeHook, CollectionConfig, Payload } from "payload";
import { authenticated } from "../access/authenticated";
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

    const existing = await payload.find({
      collection: "essentials-stock",
      where: {
        school: { equals: schoolId },
        kind: { equals: item.kind },
        refId: { equals: item.refId },
        variantKey: { equals: variantKey },
      },
      limit: 1,
    });
    const row = existing.docs[0];
    if (!row) continue;

    await payload.update({
      collection: "essentials-stock",
      id: row.id,
      data: { quantityOnHand: (row.quantityOnHand as number) - item.quantity },
    });
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

/** Mirrors src/types/receipt.ts Receipt. Real write path for checkout — see src/lib/data-source/receipts.ts. */
export const Receipts: CollectionConfig = {
  slug: "receipts",
  // See Orders.ts's comment — same rationale.
  access: { read: () => true, create: authenticated, update: () => true, delete: () => true },
  hooks: { afterChange: [notifyReadyToCollect] },
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
