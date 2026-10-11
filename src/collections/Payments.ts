import type { CollectionConfig } from "payload";
import { denyAll, readOwnOrStaff } from "../access/request-access";

/**
 * One row per payment attempt (see the payments migration for the life cycle).
 * Strict access like the other request-style collections: a student may READ
 * their own attempts, staff read all, and NOBODY writes over REST — payments
 * are created, confirmed and settled only by the routes under
 * src/app/(payload)/api/payments/*, which price the cart on the server and talk
 * to the payment provider (Local API bypasses these rules on purpose).
 */
export const Payments: CollectionConfig = {
  slug: "payments",
  admin: { useAsTitle: "id", defaultColumns: ["status", "amount", "provider", "createdAt"] },
  access: { read: readOwnOrStaff, create: denyAll, update: denyAll, delete: denyAll },
  fields: [
    { name: "school", type: "relationship", relationTo: "schools", required: true },
    { name: "user", type: "relationship", relationTo: "users", required: true },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: ["pending", "paid", "failed", "cancelled", "expired"],
    },
    { name: "amount", type: "number", required: true },
    { name: "currency", type: "text", required: true, defaultValue: "INR" },
    { name: "method", type: "text" },
    { name: "provider", type: "text", required: true },
    { name: "providerOrderId", type: "text" },
    { name: "providerPaymentId", type: "text" },
    { name: "itemsFingerprint", type: "text", required: true },
    // This payment is a new-admission student's full uniform set; and, for a single extra item, the approved request(s) it uses up.
    { name: "newAdmissionSet", type: "checkbox", defaultValue: false },
    { name: "extraRequestIds", type: "json" },
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
      ],
    },
    { name: "expiresAt", type: "date" },
    { name: "failureReason", type: "text" },
    { name: "completedAt", type: "date" },
    { name: "order", type: "relationship", relationTo: "orders" },
    // The provider confirmed money AFTER the attempt had been cancelled / had expired.
    { name: "lateSuccess", type: "checkbox", defaultValue: false },
    // Staff should look at this one (e.g. a late success that duplicates another paid order → likely refund).
    { name: "needsReview", type: "checkbox", defaultValue: false },
    { name: "reviewNote", type: "text" },
  ],
};
