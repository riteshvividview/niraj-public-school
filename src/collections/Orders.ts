import type { CollectionConfig } from "payload";
import { authenticated } from "../access/authenticated";

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
