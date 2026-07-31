import type { CollectionConfig } from "payload";
import { authenticated } from "../access/authenticated";

/**
 * Mirrors src/types/order.ts Order. Defined for completeness (Phase 9 item 3)
 * — the live checkout/payment/scanner flow still runs on the existing
 * localStorage-backed src/store/receipts-store.tsx for this phase (that
 * store was intentionally outside src/lib/data-source/*, so it's outside
 * this phase's literal "swap the data-source layer" instruction). See
 * .claude/DECISIONS.md for the scope reasoning.
 */
export const Orders: CollectionConfig = {
  slug: "orders",
  access: { read: authenticated, create: authenticated, update: authenticated, delete: authenticated },
  fields: [
    { name: "user", type: "relationship", relationTo: "users", required: true },
    { name: "school", type: "relationship", relationTo: "schools", required: true },
    {
      name: "items",
      type: "array",
      required: true,
      minRows: 1,
      fields: [
        { name: "kind", type: "select", required: true, options: ["book", "uniform", "stationery", "program"] },
        { name: "refId", type: "text", required: true },
        { name: "label", type: "text", required: true },
        { name: "meta", type: "text" },
        { name: "unitPrice", type: "number", required: true },
        { name: "quantity", type: "number", required: true },
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
