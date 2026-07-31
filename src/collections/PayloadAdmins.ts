import type { CollectionConfig } from "payload";

/**
 * The CMS operator login — whoever signs into /admin directly (developers,
 * or school administrators once onboarded to Payload itself). This is a
 * THIRD, distinct account system from the app's other two:
 *  - Parent/student login (Phase 3, mock OTP, src/store/auth-store.tsx)
 *  - School console login (Phase 8, mock, src/store/console-auth-store.tsx)
 * Every Payload project needs at least one `auth: true` collection to power
 * /admin — this is it. Not linked to app-level roles/access yet.
 */
export const PayloadAdmins: CollectionConfig = {
  slug: "payload-admins",
  auth: true,
  admin: { useAsTitle: "email" },
  access: {
    read: ({ req: { user } }) => Boolean(user),
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  fields: [{ name: "name", type: "text" }],
};
