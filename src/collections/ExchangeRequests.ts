import type { CollectionConfig } from "payload";
import { denyAll, readOwnOrStaff } from "../access/request-access";

/**
 * Mirrors src/types/exchange.ts ExchangeRequest. Read-only over REST (own
 * rows for a student, everything for staff); all writes happen in the route
 * handlers under src/app/(payload)/api/exchange/ — see access/request-access.ts.
 * The table itself (constraints, partial unique index, completion function)
 * is hand-written SQL: supabase/migrations/*_exchange_requests.sql.
 */
export const ExchangeRequests: CollectionConfig = {
  slug: "exchange-requests",
  admin: { useAsTitle: "itemLabel", defaultColumns: ["itemLabel", "fromSize", "toSize", "status", "createdAt"] },
  access: { read: readOwnOrStaff, create: denyAll, update: denyAll, delete: denyAll },
  fields: [
    { name: "school", type: "relationship", relationTo: "schools", required: true },
    { name: "user", type: "relationship", relationTo: "users", required: true },
    { name: "order", type: "relationship", relationTo: "orders", required: true },
    { name: "receipt", type: "relationship", relationTo: "receipts", required: true },
    { name: "orderItemId", type: "text", required: true },
    { name: "uniformItemId", type: "text", required: true },
    { name: "itemLabel", type: "text", required: true },
    { name: "fromSize", type: "text", required: true },
    { name: "toSize", type: "text", required: true },
    { name: "quantity", type: "number", required: true, defaultValue: 1 },
    { name: "fromUnitPrice", type: "number", required: true },
    { name: "toUnitPrice", type: "number", required: true },
    { name: "priceDifference", type: "number", required: true },
    {
      name: "reason",
      type: "select",
      required: true,
      options: ["size-too-small", "size-too-large", "defect", "other"],
    },
    { name: "note", type: "text" },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: ["pending", "approved", "rejected", "cancelled", "completed"],
    },
    { name: "staffNote", type: "text" },
    { name: "contactNote", type: "text", access: { read: ({ req: { user } }) => user?.collection === "payload-admins" } },
    { name: "decidedBy", type: "relationship", relationTo: "payload-admins" },
    { name: "decidedByName", type: "text" },
    { name: "decidedAt", type: "date" },
    { name: "completedBy", type: "relationship", relationTo: "payload-admins" },
    { name: "completedByName", type: "text" },
    { name: "completedAt", type: "date" },
    { name: "returnedToStock", type: "checkbox" },
  ],
};
