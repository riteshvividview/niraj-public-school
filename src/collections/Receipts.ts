import type { CollectionConfig } from "payload";
import { authenticated } from "../access/authenticated";

/** Mirrors src/types/receipt.ts Receipt. See Orders.ts for the same scope note. */
export const Receipts: CollectionConfig = {
  slug: "receipts",
  access: { read: authenticated, create: authenticated, update: authenticated, delete: authenticated },
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
