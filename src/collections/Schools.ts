import type { CollectionConfig } from "payload";
import { authenticated } from "../access/authenticated";
import { administratorOnlyField } from "../access/request-access";

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
    // Payment safety settings — see src/lib/server/payments. Administrator-only.
    //   duplicate window: a repeat of the SAME items within N minutes of a paid order is
    //   stopped with "you already paid for this" (0 = off).
    //   pending timeout: how long a started-but-unfinished payment blocks a second attempt.
    {
      name: "paymentDuplicateWindowMinutes",
      type: "number",
      defaultValue: 30,
      min: 0,
      max: 1440,
      access: { read: administratorOnlyField, update: administratorOnlyField, create: administratorOnlyField },
    },
    {
      name: "paymentPendingTimeoutMinutes",
      type: "number",
      defaultValue: 30,
      min: 5,
      max: 1440,
      access: { read: administratorOnlyField, update: administratorOnlyField, create: administratorOnlyField },
    },
    // Extra inbox for exchange / subject-change request notifications, on top
    // of every active administrator — set from the console's Administration
    // tab. Administrator-only to read and write (the collection's own
    // `read` is public for the unauthenticated parent app).
    {
      name: "requestNotifyEmail",
      type: "email",
      access: { read: administratorOnlyField, update: administratorOnlyField, create: administratorOnlyField },
    },
  ],
};
