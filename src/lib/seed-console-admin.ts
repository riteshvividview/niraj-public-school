import type { Payload } from "payload";

const DEMO_ADMIN_EMAIL = "admin@nirajpublicschool.edu.in";
const DEMO_ADMIN_PASSWORD = "admin123";

/**
 * Idempotent: creates the kept demo Console/admin account as a real
 * `payload-admins` row (Local API, so its password is hashed correctly by
 * Payload's own auth strategy) if it doesn't already exist. Separate from
 * seed-payload.ts (mock catalogue data) since this isn't school-scoped and
 * shouldn't be re-run every time that seed runs.
 */
export async function ensureConsoleAdminSeed(payload: Payload): Promise<{ created: boolean }> {
  const existing = await payload.find({
    collection: "payload-admins",
    where: { email: { equals: DEMO_ADMIN_EMAIL } },
    limit: 1,
  });
  if (existing.docs.length > 0) {
    return { created: false };
  }

  await payload.create({
    collection: "payload-admins",
    data: {
      name: "School Admin",
      email: DEMO_ADMIN_EMAIL,
      password: DEMO_ADMIN_PASSWORD,
      role: "administrator",
      status: "active",
    },
  });
  return { created: true };
}
