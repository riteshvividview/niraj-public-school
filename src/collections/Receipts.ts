import type { CollectionAfterChangeHook, CollectionConfig } from "payload";
import { authenticated } from "../access/authenticated";
import { readyToCollectEmail } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/brevo";

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
  if (!order || !user?.email) return doc;

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
