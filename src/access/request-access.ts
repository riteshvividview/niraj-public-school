import type { Access, FieldAccess } from "payload";

/**
 * Access rules for the request-style collections (exchange-requests,
 * book-change-requests). Deliberately strict, unlike the older
 * `() => true` collections: a student may only ever READ their own rows,
 * school staff (a `payload-admins` session) may read all, and NOBODY writes
 * through the generic REST endpoints — every create/transition goes through
 * the purpose-built route handlers in src/app/(payload)/api/{exchange,book-change}/*,
 * which authenticate the caller, validate the business rules and use the
 * Local API (which bypasses these rules on purpose).
 */
export const readOwnOrStaff: Access = ({ req: { user } }) => {
  if (!user) return false;
  if (user.collection === "payload-admins") return true;
  return { user: { equals: user.id } };
};

/** A staff member sees everyone; a student/parent sees only their own account record. */
export const staffOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false;
  if (user.collection === "payload-admins") return true;
  return { id: { equals: user.id } };
};

export const denyAll: Access = () => false;

/** Only a logged-in school staff member (a `payload-admins` session). */
export const staffOnly: Access = ({ req: { user } }) => Boolean(user && user.collection === "payload-admins");

/**
 * Field-level: only a logged-in school staff member (a `payload-admins`
 * session) may set this field. Used on the student fields that decide which
 * book set a student gets — the roster/console sets them, a student can only
 * *request* a change (book-change-requests). Payload silently ignores a write
 * the caller isn't allowed to make, so a forged PATCH from a student account
 * (or an anonymous call) simply has no effect on these fields.
 */
/**
 * Field-level: school staff, or the account the record belongs to. Used for the
 * student's delivery address — the Users collection is otherwise publicly
 * readable, and a home address must not be.
 */
export const staffOrOwnerField: FieldAccess = ({ req: { user }, id }) =>
  Boolean(user && (user.collection === "payload-admins" || (id !== undefined && String(user.id) === String(id))));

export const staffOnlyField: FieldAccess = ({ req: { user } }) => Boolean(user && user.collection === "payload-admins");

/** Field-level: only a logged-in administrator (not plain staff, not a student). */
export const administratorOnlyField: FieldAccess = ({ req: { user } }) =>
  Boolean(user && user.collection === "payload-admins" && (user as { role?: string }).role === "administrator");
