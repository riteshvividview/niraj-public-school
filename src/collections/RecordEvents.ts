import type { Access, CollectionConfig } from "payload";
import { denyAll } from "../access/request-access";

const staffOnly: Access = ({ req: { user } }) => Boolean(user && user.collection === "payload-admins");

/**
 * Append-only activity log — see supabase/migrations/*_record_history.sql.
 * Written only by server code (Local API: collection hooks and the request
 * routes via src/lib/server/record-events.ts); readable by school staff only;
 * never updatable or deletable — the database enforces that too (triggers),
 * so this holds even against a direct SQL client.
 */
export const RecordEvents: CollectionConfig = {
  slug: "record-events",
  admin: { useAsTitle: "summary", defaultColumns: ["summary", "studentName", "eventType", "createdAt"] },
  access: { read: staffOnly, create: denyAll, update: denyAll, delete: denyAll },
  fields: [
    { name: "eventType", type: "text", required: true },
    { name: "entityType", type: "text", required: true },
    { name: "entityId", type: "text" },
    { name: "school", type: "relationship", relationTo: "schools", required: true },
    { name: "student", type: "relationship", relationTo: "users", required: true },
    { name: "studentName", type: "text", required: true },
    { name: "registerNumber", type: "text" },
    { name: "receiptCode", type: "text" },
    { name: "actorType", type: "select", required: true, options: ["student", "staff", "system"] },
    { name: "actorId", type: "text" },
    { name: "actorName", type: "text" },
    { name: "summary", type: "text", required: true },
    { name: "details", type: "json" },
  ],
};
