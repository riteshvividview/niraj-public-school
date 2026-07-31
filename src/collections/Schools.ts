import type { CollectionConfig } from "payload";
import { authenticated } from "../access/authenticated";

/** Mirrors src/types/school.ts School. */
export const Schools: CollectionConfig = {
  slug: "schools",
  admin: { useAsTitle: "name" },
  // Public read: the parent/student app has no real Payload session (see
  // .claude/DECISIONS.md "Phase 9 access control"), so every client-side
  // data-source read against this collection is an unauthenticated REST call.
  access: { read: () => true, create: authenticated, update: authenticated, delete: authenticated },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
    { name: "city", type: "text", required: true },
    { name: "state", type: "text", required: true },
    { name: "logoUrl", type: "text" },
    { name: "contactPhone", type: "text", required: true },
    { name: "contactEmail", type: "text", required: true },
  ],
};
