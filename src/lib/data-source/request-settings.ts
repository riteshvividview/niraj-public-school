import { payloadFindById, payloadUpdate } from "./payload-rest";

/**
 * Console Administration — the optional extra inbox that receives every
 * exchange / subject-change update (on top of all active administrators).
 * `requestNotifyEmail` is administrator-only at the field level (see
 * collections/Schools.ts), and is read fresh here (not via getSchools'
 * cache) so the card always shows what is really saved.
 */
export async function getRequestNotifyEmail(schoolId: string): Promise<string> {
  const doc = await payloadFindById<{ requestNotifyEmail?: string | null }>("schools", schoolId);
  return doc?.requestNotifyEmail ?? "";
}

/** Pass an empty string to remove the extra inbox. Returns the value that is actually stored afterwards. */
export async function setRequestNotifyEmail(schoolId: string, email: string): Promise<string> {
  const trimmed = email.trim().toLowerCase();
  await payloadUpdate("schools", schoolId, { requestNotifyEmail: trimmed || null });
  // Payload silently ignores a field the caller can't write, so confirm what was really stored.
  const stored = await getRequestNotifyEmail(schoolId);
  if (stored !== trimmed) throw new Error("Only an administrator can change this setting.");
  return stored;
}
