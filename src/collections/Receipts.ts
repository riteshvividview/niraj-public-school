import type { CollectionConfig } from "payload";
import { authenticated } from "../access/authenticated";

/** Mirrors src/types/receipt.ts Receipt. Real write path for checkout — see src/lib/data-source/receipts.ts. */
export const Receipts: CollectionConfig = {
  slug: "receipts",
  // See Orders.ts's comment — same rationale.
  access: { read: () => true, create: authenticated, update: () => true, delete: () => true },
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
      options: ["ready", "collected", "checked-in"],
    },
    { name: "issuedAt", type: "date", required: true },
    { name: "redeemedAt", type: "date" },
  ],
};
