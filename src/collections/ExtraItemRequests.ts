import type { CollectionConfig } from "payload";
import { denyAll, readOwnOrStaff } from "../access/request-access";

/**
 * A new-admission student asking to buy ONE extra uniform item after their full
 * set (only staff know if it is in stock). Same access model as the other request
 * collections: REST-readable by the owner and by staff, never writable over REST;
 * everything goes through src/app/(payload)/api/extra-items/*.
 * pending → approved (parent may now pay for it) → used (paid) · or rejected / cancelled.
 * Table + constraints: supabase/migrations/*_new_admission.sql.
 */
export const ExtraItemRequests: CollectionConfig = {
  slug: "extra-item-requests",
  admin: { useAsTitle: "itemLabel", defaultColumns: ["user", "itemLabel", "status", "createdAt"] },
  access: { read: readOwnOrStaff, create: denyAll, update: denyAll, delete: denyAll },
  fields: [
    { name: "school", type: "relationship", relationTo: "schools", required: true },
    { name: "user", type: "relationship", relationTo: "users", required: true },
    { name: "uniformItem", type: "relationship", relationTo: "uniform-items", required: true },
    { name: "itemLabel", type: "text", required: true },
    { name: "size", type: "text", required: true },
    { name: "note", type: "text" },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: ["pending", "approved", "rejected", "cancelled", "used"],
    },
    { name: "staffNote", type: "text" },
    { name: "handledBy", type: "relationship", relationTo: "payload-admins" },
    { name: "handledByName", type: "text" },
    { name: "handledAt", type: "date" },
    { name: "usedPayment", type: "relationship", relationTo: "payments" },
  ],
};
