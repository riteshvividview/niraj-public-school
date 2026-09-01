import type { CollectionBeforeChangeHook, CollectionConfig } from "payload";

/**
 * Blocks any update that would leave the school with zero active
 * administrators — whether that's disabling the last one or demoting them
 * to staff. Applies regardless of entry point (Console UI or raw /admin),
 * since it lives on the collection itself, not in any one route.
 */
const preventLastAdminLockout: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  if (operation !== "update" || !originalDoc) return data;
  const willDisable = data.status === "disabled" && originalDoc.status !== "disabled";
  const willDemote = data.role === "staff" && originalDoc.role === "administrator";
  if (!willDisable && !willDemote) return data;

  const remaining = await req.payload.count({
    collection: "payload-admins",
    where: {
      and: [
        { id: { not_equals: originalDoc.id } },
        { role: { equals: "administrator" } },
        { status: { equals: "active" } },
      ],
    },
  });
  if (remaining.totalDocs === 0) {
    throw new Error("Can't remove the last administrator — promote someone else first.");
  }
  return data;
};

/**
 * At most one row may carry `isSharedDemoAccount: true` — setting it on one
 * clears it from any other, so the console-auth/demo-access route can just
 * create-or-update without worrying about duplicates from a race.
 */
const enforceSingleSharedDemoAccount: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  if (data.isSharedDemoAccount !== true) return data;
  const others = await req.payload.find({
    collection: "payload-admins",
    where: { and: [{ isSharedDemoAccount: { equals: true } }, { id: { not_equals: originalDoc?.id ?? "" } }] },
  });
  await Promise.all(
    others.docs.map((doc) => req.payload.update({ collection: "payload-admins", id: doc.id, data: { isSharedDemoAccount: false } })),
  );
  return data;
};

/** The shared demo account can never become an administrator, even via a direct REST role change. */
const pinSharedDemoAccountRole: CollectionBeforeChangeHook = async ({ data, originalDoc }) => {
  if (originalDoc?.isSharedDemoAccount === true) data.role = "staff";
  return data;
};

/**
 * The one account system shared by raw /admin and the School Console
 * (src/store/console-auth-store.tsx). `role` splits the two: `administrator`
 * can do everything (including /admin itself and inviting other staff),
 * `staff` is Console-only — see `access.admin` below, which is what actually
 * keeps a `staff` account out of the raw CMS UI.
 *
 * New accounts are never handed a password directly — an administrator adds
 * a name+email from the Console's Administration tab
 * (src/app/(payload)/api/console-auth/invite/route.ts), which creates the
 * row with a random, never-surfaced password and `status: "invited"`, then
 * emails an OTP. The invitee sets their own real password at
 * /console/accept-invite (src/app/(payload)/api/console-auth/accept-invite/route.ts),
 * which flips `status` to "active". From then on, every login challenges
 * with an emailed OTP unless the browser already holds a valid entry in
 * `trustedDevices` (src/app/(payload)/api/console-auth/{precheck,verify-device-otp}/route.ts)
 * — or the account is flagged `isSharedDemoAccount`, in which case `precheck`
 * always skips straight past the OTP step. Exactly one such account may
 * exist, managed only via src/app/(payload)/api/console-auth/demo-access/route.ts
 * from the Console's Administration tab.
 */
export const PayloadAdmins: CollectionConfig = {
  slug: "payload-admins",
  auth: true,
  admin: { useAsTitle: "email" },
  hooks: { beforeChange: [preventLastAdminLockout, enforceSingleSharedDemoAccount, pinSharedDemoAccountRole] },
  access: {
    read: ({ req: { user } }) => Boolean(user),
    // Invites/removals go through the console-auth routes above (which
    // check role === "administrator" explicitly, server-side) — this is
    // belt-and-suspenders against a stray direct REST call.
    create: ({ req: { user } }) => Boolean(user && (user as { role?: string }).role === "administrator"),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user && (user as { role?: string }).role === "administrator"),
    admin: ({ req: { user } }) => Boolean(user && (user as { role?: string }).role === "administrator"),
  },
  fields: [
    { name: "name", type: "text" },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "staff",
      options: [
        { label: "Administrator", value: "administrator" },
        { label: "Staff", value: "staff" },
      ],
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "active",
      options: [
        { label: "Invited", value: "invited" },
        { label: "Active", value: "active" },
        { label: "Disabled", value: "disabled" },
      ],
    },
    { name: "invitedByEmail", type: "text" },
    { name: "invitedAt", type: "date" },
    { name: "lastLoginAt", type: "date" },
    // Set only via the Local API (console-auth/demo-access route) — REST
    // updates to this field are always rejected, so an administrator is the
    // only way in. See enforceSingleSharedDemoAccount/pinSharedDemoAccountRole above.
    { name: "isSharedDemoAccount", type: "checkbox", defaultValue: false, access: { update: () => false } },
    // OTP state (invite acceptance + new-device login challenge) — same
    // shape as Users' fields, same reason field-level read is closed: only
    // the console-auth routes (Local API, server-side) ever touch these.
    { name: "otpCodeHash", type: "text", access: { read: () => false } },
    { name: "otpExpiresAt", type: "date", access: { read: () => false } },
    { name: "otpVerifiedAt", type: "date", access: { read: () => false } },
    {
      name: "trustedDevices",
      type: "array",
      access: { read: () => false },
      fields: [
        { name: "tokenHash", type: "text", required: true },
        { name: "label", type: "text" },
        { name: "createdAt", type: "date", required: true },
        { name: "lastUsedAt", type: "date" },
        { name: "expiresAt", type: "date", required: true },
      ],
    },
  ],
};
