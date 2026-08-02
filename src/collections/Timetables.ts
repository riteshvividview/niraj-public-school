import type { CollectionConfig } from "payload";

/**
 * One per school + class level (enforced by console UX, not a DB
 * constraint — the console always fetches "the timetable for class X"
 * before showing the editor, and Save creates or updates in place, never a
 * second doc for the same class). Mirrors src/types/timetable.ts Timetable.
 */
export const Timetables: CollectionConfig = {
  slug: "timetables",
  admin: { useAsTitle: "classLevel" },
  // Fully open: same reason as every other console-writable collection —
  // see Books.ts's comment / .claude/DECISIONS.md "Phase 9 access control".
  access: { read: () => true, create: () => true, update: () => true, delete: () => true },
  fields: [
    { name: "school", type: "relationship", relationTo: "schools", required: true },
    { name: "classLevel", type: "relationship", relationTo: "class-levels", required: true },
    {
      name: "periods",
      type: "array",
      fields: [
        { name: "label", type: "text", required: true },
        { name: "monday", type: "text" },
        { name: "tuesday", type: "text" },
        { name: "wednesday", type: "text" },
        { name: "thursday", type: "text" },
        { name: "friday", type: "text" },
        { name: "saturday", type: "text" },
      ],
    },
    {
      name: "notes",
      type: "array",
      fields: [
        { name: "heading", type: "text", required: true },
        { name: "body", type: "textarea" },
      ],
    },
  ],
};
