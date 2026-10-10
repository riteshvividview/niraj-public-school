import type { CollectionConfig } from "payload";
import { denyAll, readOwnOrStaff } from "../access/request-access";

const SECOND_LANGUAGES = [
  { label: "Hindi", value: "hindi" },
  { label: "Telugu", value: "telugu" },
];
const STREAMS = [
  { label: "Science", value: "science" },
  { label: "Economics", value: "economics" },
];
const ELECTIVES = [
  { label: "ENA", value: "ena" },
  { label: "Robotics & AI", value: "roboticsAI" },
  { label: "Home Science", value: "homeScience" },
];

/**
 * Mirrors src/types/book-change.ts BookChangeRequest. Same access model as
 * ExchangeRequests (see access/request-access.ts): REST-readable by the
 * owning student and by staff, never writable over REST — creation and every
 * status change go through src/app/(payload)/api/book-change/*. Table +
 * constraints + the approval function: supabase/migrations/*_book_change_requests.sql.
 */
export const BookChangeRequests: CollectionConfig = {
  slug: "book-change-requests",
  admin: { useAsTitle: "reason", defaultColumns: ["user", "status", "createdAt"] },
  access: { read: readOwnOrStaff, create: denyAll, update: denyAll, delete: denyAll },
  fields: [
    { name: "school", type: "relationship", relationTo: "schools", required: true },
    { name: "user", type: "relationship", relationTo: "users", required: true },
    {
      name: "requested",
      type: "group",
      fields: [
        { name: "secondLanguage", type: "select", options: SECOND_LANGUAGES },
        { name: "stream", type: "select", options: STREAMS },
        { name: "elective", type: "select", options: ELECTIVES },
      ],
    },
    {
      name: "current",
      type: "group",
      fields: [
        { name: "secondLanguage", type: "select", options: SECOND_LANGUAGES },
        { name: "stream", type: "select", options: STREAMS },
        { name: "elective", type: "select", options: ELECTIVES },
      ],
    },
    { name: "reason", type: "text", required: true },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: ["pending", "approved", "rejected", "cancelled"],
    },
    { name: "staffNote", type: "text" },
    { name: "contactNote", type: "text", access: { read: ({ req: { user } }) => user?.collection === "payload-admins" } },
    { name: "decidedBy", type: "relationship", relationTo: "payload-admins" },
    { name: "decidedByName", type: "text" },
    { name: "decidedAt", type: "date" },
  ],
};
