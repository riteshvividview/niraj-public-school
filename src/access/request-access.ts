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

export const denyAll: Access = () => false;

/**
 * Field-level: only a logged-in school staff member (a `payload-admins`
 * session) may set this field. Used on the student fields that decide which
 * book set a student gets — the roster/console sets them, a student can only
 * *request* a change (book-change-requests). Payload silently ignores a write
 * the caller isn't allowed to make, so a forged PATCH from a student account
 * (or an anonymous call) simply has no effect on these fields.
 */
export const staffOnlyField: FieldAccess = ({ req: { user } }) => Boolean(user && user.collection === "payload-admins");

/** Field-level: only a logged-in administrator (not plain staff, not a student). */
export const administratorOnlyField: FieldAccess = ({ req: { user } }) =>
  Boolean(user && user.collection === "payload-admins" && (user as { role?: string }).role === "administrator");
