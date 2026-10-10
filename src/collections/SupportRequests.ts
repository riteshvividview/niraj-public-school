import type { CollectionConfig } from "payload";
import { denyAll, readOwnOrStaff } from "../access/request-access";

/**
 * Mirrors src/types/support.ts SupportRequest — a parent's query to the
 * school. Same access model as ExchangeRequests (see access/request-access.ts):
 * REST-readable by the owning student and by staff, never writable over REST;
 * creation and status changes go through src/app/(payload)/api/support/*.
 * Table + constraints: supabase/migrations/*_support_requests.sql.
 */
export const SupportRequests: CollectionConfig = {
  slug: "support-requests",
  admin: { useAsTitle: "message", defaultColumns: ["user", "status", "createdAt"] },
  access: { read: readOwnOrStaff, create: denyAll, update: denyAll, delete: denyAll },
  fields: [
    { name: "school", type: "relationship", relationTo: "schools", required: true },
    { name: "user", type: "relationship", relationTo: "users", required: true },
    { name: "message", type: "textarea", required: true },
    // Where the family would like to be reached (prefilled from their profile, editable).
    { name: "contactPhone", type: "text" },
    { name: "contactEmail", type: "text" },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "open",
      options: ["open", "in-progress", "resolved"],
    },
    { name: "staffNote", type: "text" },
    { name: "contactNote", type: "text", access: { read: ({ req: { user } }) => user?.collection === "payload-admins" } },
    { name: "handledBy", type: "relationship", relationTo: "payload-admins" },
    { name: "handledByName", type: "text" },
    { name: "handledAt", type: "date" },
    { name: "resolvedAt", type: "date" },
  ],
};
