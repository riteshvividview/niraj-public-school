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
 * Mirrors src/types/book-change.ts. Originally a request/approval flow; since 2026-10-28 it is the LOG of
 * subject changes (status "applied") — students change their own selection on Essentials -> Books before
 * buying (/api/books/selection), staff change it on the student's profile (Users afterChange hook). Never
 * writable over REST. Older pending/approved/rejected rows are kept as history.
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
      // "applied" = a change that was made directly (by the student before buying, or by staff) — the log.
      options: ["pending", "approved", "rejected", "cancelled", "applied"],
    },
    { name: "staffNote", type: "text" },
    { name: "contactNote", type: "text", access: { read: ({ req: { user } }) => user?.collection === "payload-admins" } },
    { name: "decidedBy", type: "relationship", relationTo: "payload-admins" },
    { name: "decidedByName", type: "text" },
    { name: "decidedAt", type: "date" },
    // Snapshot of the class the student was in when the change was made.
    { name: "classLevel", type: "relationship", relationTo: "class-levels" },
    { name: "classLabel", type: "text" },
    { name: "changedByType", type: "select", options: ["student", "staff"] },
    { name: "changedByName", type: "text" },
  ],
};
