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

/** Field-level: only a logged-in administrator (not plain staff, not a student). */
export const administratorOnlyField: FieldAccess = ({ req: { user } }) =>
  Boolean(user && user.collection === "payload-admins" && (user as { role?: string }).role === "administrator");
