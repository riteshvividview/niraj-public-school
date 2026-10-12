import { APIError, type CollectionAfterChangeHook, type CollectionBeforeChangeHook, type CollectionBeforeDeleteHook, type CollectionConfig } from "payload";
import { staffOnly, staffOnlyField, staffOrOwnerField, staffOrSelf } from "../access/request-access";
import { isPlausiblePhone } from "@/lib/contact-links";
import { PINCODE_PATTERN } from "@/lib/address";
import { actorFromUser, recordEvent } from "@/lib/server/record-events";

/**
 * Mirrors src/types/user-profile.ts UserProfile — student/parent portal
 * accounts. No self-registration: only the school console (staff/teachers)
 * or /admin creates these records (manually or via bulk import) — see
 * .claude/DECISIONS.md's "No self-registration, register-number login"
 * entry. Access is fully open (`() => true` on every operation) for the
 * same reason every other console-writable collection is: the console's
 * staff session is still a mock (Phase 8), not a real Payload session, so
 * its REST calls (create/edit/reset-password/delete a student from the
 * Students manager) carry no auth cookie. This is a known, deliberate,
 * temporary gap — see DECISIONS.md — and a more sensitive instance of it
 * than most, since it also covers password resets; tighten the moment
 * console auth becomes real.
 *
 * Login uses Payload's built-in `loginWithUsername` (email login fully
 * disabled) — the `username` field IS the school's register number; the
 * app's own UI labels it "Register Number" everywhere but the underlying
 * Payload field/endpoint is the standard `username`/`/login` mechanism, not
 * a custom one.
 */
/**
 * A student who has any order, receipt, exchange, subject-change or support
 * history can't be deleted — that history has to stay readable (the database
 * enforces the same with RESTRICT foreign keys). Say so plainly instead of
 * surfacing a foreign-key error.
 */
const keepStudentsWithHistory: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const checks = ["orders", "receipts", "payments", "extra-item-requests", "exchange-requests", "book-change-requests", "support-requests", "record-events"] as const;
  for (const collection of checks) {
    const key = collection === "record-events" ? "student" : "user";
    const found = await req.payload.count({ collection, where: { [key]: { equals: id } } });
    if (found.totalDocs > 0) {
      throw new APIError(
        "This student has order or request history, which the school keeps permanently, so they can't be deleted.",
        409,
        undefined,
        true,
      );
    }
  }
};

const ADDRESS_KEYS = ["house", "street", "landmark", "city", "state", "pincode", "phone", "latitude", "longitude", "source"] as const;
const ADDRESS_REQUIRED = ["house", "street", "city", "state", "pincode"] as const;
const ADDRESS_LABELS: Record<string, string> = {
  house: "flat / house number",
  street: "street / area",
  city: "city",
  state: "state",
  pincode: "pincode",
};

/**
 * The address is optional, but never half-saved: either every delivery field
 * is present and valid, or the whole address is cleared. Runs for every write
 * (student's own save, console edit, bulk import), so the rules live here and
 * not in any one screen — the database has matching CHECK constraints.
 * Partial PATCHes are merged onto the stored address before validating.
 */
const normalizeAddress: CollectionBeforeChangeHook = async ({ data, originalDoc }) => {
  if (!data || data.address === undefined || data.address === null) return data;
  const merged: Record<string, unknown> = { ...(originalDoc?.address ?? {}), ...(data.address as Record<string, unknown>) };

  const text = (key: string): string | null => {
    const value = merged[key];
    return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  };
  const next: Record<string, unknown> = {};
  for (const key of ADDRESS_KEYS) next[key] = merged[key] ?? null;
  for (const key of ["house", "street", "landmark", "city", "state", "pincode", "phone"]) next[key] = text(key);

  const anyRequired = ADDRESS_REQUIRED.some((key) => next[key] !== null);
  if (!anyRequired) {
    // Cleared.
    data.address = Object.fromEntries([...ADDRESS_KEYS.map((key) => [key, null]), ["updatedAt", null]]);
    return data;
  }

  const missing = ADDRESS_REQUIRED.filter((key) => next[key] === null);
  if (missing.length > 0) {
    throw new APIError(`Please fill in: ${missing.map((key) => ADDRESS_LABELS[key]).join(", ")}.`, 400, undefined, true);
  }
  if (!PINCODE_PATTERN.test(String(next.pincode))) {
    throw new APIError("Enter a valid 6-digit pincode.", 400, undefined, true);
  }
  if (next.phone !== null && !isPlausiblePhone(String(next.phone))) {
    throw new APIError("That delivery phone number doesn't look right.", 400, undefined, true);
  }
  const lat = next.latitude === null || next.latitude === undefined ? null : Number(next.latitude);
  const lng = next.longitude === null || next.longitude === undefined ? null : Number(next.longitude);
  if ((lat === null) !== (lng === null) || (lat !== null && (!(lat >= -90 && lat <= 90) || !(lng! >= -180 && lng! <= 180)))) {
    throw new APIError("The location coordinates are not valid.", 400, undefined, true);
  }
  next.latitude = lat;
  next.longitude = lng;
  next.source = next.source === "live-location" && lat !== null ? "live-location" : "manual";
  next.updatedAt = new Date().toISOString();
  data.address = next;
  return data;
};

/** Permanent activity log: address saved / removed (who, when) — the address itself stays in the user record. */
const logAddressChange: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  // Only real actions by a signed-in student/staff member. A login (or any system update) runs
  // without a user, so the address is hidden from that request and would look like a removal.
  if (operation !== "update" || !req.user) return doc;
  // Only someone who can actually SEE the address (staff, or the owner) can have changed it — anyone else
  // sees it hidden, which would otherwise look like a removal.
  const canSee = req.user.collection === "payload-admins" || String(req.user.id) === String(doc.id);
  if (!canSee) return doc;
  const sig = (address: Record<string, unknown> | null | undefined) =>
    JSON.stringify(ADDRESS_KEYS.map((key) => address?.[key] ?? null));
  if (sig(previousDoc?.address) === sig(doc.address)) return doc;

  const hasNow = Boolean(doc.address?.house);
  const schoolId = typeof doc.school === "string" ? doc.school : doc.school?.id;
  if (!schoolId) return doc;
  // Same transaction as the user update (req): a separate connection would wait on this very row's lock.
  await recordEvent(req.payload, {
    eventType: hasNow ? "profile.address_updated" : "profile.address_removed",
    entityType: "profile",
    entityId: String(doc.id),
    schoolId,
    studentId: String(doc.id),
    studentName: doc.name,
    registerNumber: doc.username,
    actor: actorFromUser(req.user),
    summary: hasNow
      ? `Delivery address saved${doc.address.source === "live-location" ? " from live location" : ""} — ${doc.address.city} ${doc.address.pincode}`
      : "Delivery address removed",
    details: hasNow ? { source: doc.address.source, city: doc.address.city, state: doc.address.state, pincode: doc.address.pincode } : undefined,
  }, req);
  return doc;
};

/** A student editing their own account can never change their register number (the login). */
const lockIdentity: CollectionBeforeChangeHook = ({ data, originalDoc, req, operation }) => {
  if (operation === "update" && req.user?.collection === "users" && originalDoc) {
    data.username = (originalDoc as { username?: string }).username;
  }
  return data;
};

export const Users: CollectionConfig = {
  slug: "users",
  auth: {
    loginWithUsername: {
      allowEmailLogin: false,
      requireEmail: false,
      requireUsername: true,
    },
    tokenExpiration: 60 * 60 * 24 * 7, // 7 days — a student shouldn't need to re-login often
  },
  admin: { useAsTitle: "name" },
  hooks: { beforeChange: [lockIdentity, normalizeAddress], afterChange: [logAddressChange], beforeDelete: [keepStudentsWithHistory] },
  // Staff manage every account; a student can read and edit only their own, and cannot change who they are
  // (register number, role, school, class — see staffOnlyField below and lockIdentity).
  access: { read: staffOrSelf, create: staffOnly, update: staffOrSelf, delete: staffOnly },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "avatar", type: "upload", relationTo: "media" },
    { name: "mobileNumber", type: "text" },
    // Contact address for notifications (order ready/collected, OTP) —
    // distinct from the `username` auth field above, which stays the
    // register number. Never used for login.
    { name: "email", type: "email" },
    // Change-password OTP state. Field-level read access is closed since
    // the collection's own read access is wide open (see header comment)
    // — only the OTP request/verify/reset routes (Local API, server-side)
    // ever touch these.
    { name: "otpCodeHash", type: "text", access: { read: () => false } },
    { name: "otpExpiresAt", type: "date", access: { read: () => false } },
    { name: "otpVerifiedAt", type: "date", access: { read: () => false } },
    {
      name: "role",
      type: "select",
      required: true,
      access: { create: staffOnlyField, update: staffOnlyField },
      defaultValue: "student",
      options: [
        { label: "Parent", value: "parent" },
        { label: "Student", value: "student" },
      ],
    },
    { name: "school", type: "relationship", relationTo: "schools", required: true, access: { create: staffOnlyField, update: staffOnlyField } },
    { name: "classLevel", type: "relationship", relationTo: "class-levels", required: true, access: { create: staffOnlyField, update: staffOnlyField } },
    {
      name: "preferredLanguage",
      type: "select",
      required: true,
      defaultValue: "en",
      options: [
        { label: "English", value: "en" },
        { label: "Hindi", value: "hi" },
        { label: "Telugu", value: "te" },
      ],
    },
    // Roster/academic attributes below are all optional — populated from a
    // school's real class-list import (section, academic language, stream,
    // elective) or filled in later by staff (gender, since none of the
    // school's roster exports include it). Unset means "not recorded yet",
    // not "not applicable" — see getBooksByClass/getUniformItemsByClass,
    // which treat an unset student attribute as matching every variant.
    { name: "section", type: "text" },
    {
      name: "gender",
      type: "select",
      options: [
        { label: "Male", value: "male" },
        { label: "Female", value: "female" },
      ],
    },
    // Staff override of the "new admission" rule (normally decided by the register number's year).
    {
      name: "newAdmissionOverride",
      type: "select",
      access: { create: staffOnlyField, update: staffOnlyField },
      options: [
        { label: "Treat as a new admission", value: "new" },
        { label: "Treat as an existing student", value: "existing" },
      ],
    },
    {
      name: "academicLanguage",
      type: "select",
      // Staff-only: the assigned book set — students request changes instead (see staffOnlyField).
      access: { create: staffOnlyField, update: staffOnlyField },
      options: [
        { label: "Hindi", value: "hindi" },
        { label: "Telugu", value: "telugu" },
      ],
    },
    {
      name: "languageLevel",
      type: "select",
      // Staff-only: the assigned book set — students request changes instead (see staffOnlyField).
      access: { create: staffOnlyField, update: staffOnlyField },
      options: [
        { label: "First Language", value: "first" },
        { label: "Second Language", value: "second" },
      ],
    },
    {
      name: "stream",
      type: "select",
      // Staff-only: the assigned book set — students request changes instead (see staffOnlyField).
      access: { create: staffOnlyField, update: staffOnlyField },
      options: [
        { label: "Science", value: "science" },
        { label: "Economics", value: "economics" },
      ],
    },
    {
      name: "elective",
      type: "select",
      // Staff-only: the assigned book set — students request changes instead (see staffOnlyField).
      access: { create: staffOnlyField, update: staffOnlyField },
      options: [
        { label: "ENA", value: "ena" },
        { label: "Robotics & AI", value: "roboticsAI" },
        { label: "Home Science", value: "homeScience" },
      ],
    },
    // Optional delivery address. Readable by the student themself and by school
    // staff only (the rest of this collection is public — see header comment);
    // students save it through /api/address/save, staff through the console.
    {
      name: "address",
      type: "group",
      access: { read: staffOrOwnerField, create: staffOnlyField, update: staffOnlyField },
      fields: [
        { name: "house", type: "text" },
        { name: "street", type: "text" },
        { name: "landmark", type: "text" },
        { name: "city", type: "text" },
        { name: "state", type: "text" },
        { name: "pincode", type: "text" },
        { name: "phone", type: "text" },
        { name: "latitude", type: "number" },
        { name: "longitude", type: "number" },
        { name: "source", type: "select", options: ["manual", "live-location"] },
        { name: "updatedAt", type: "date" },
      ],
    },
  ],
};
