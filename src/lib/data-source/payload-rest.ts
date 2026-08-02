/**
 * Thin wrapper over Payload's auto-generated REST API, used by every
 * src/lib/data-source/* function.
 *
 * Why REST and not Payload's Local API: Local API only runs in a Node.js
 * server context, but every current call site in this app (Phases 1–8) is a
 * client component calling these functions directly from the browser — the
 * phase's own instruction was not to change page/component code, so REST
 * (which works from the browser, same as the withDelay-wrapped mock
 * fetches it replaces) is the only option that satisfies that constraint.
 * The seed script (scripts/seed.ts) runs as a Node script, so it uses the
 * Local API directly instead of this module.
 *
 * `depth=0` on every call (finds, creates, updates, and auth endpoints
 * alike) keeps relationship fields (e.g. a Book's `school`) as plain id
 * strings rather than populated objects, matching this app's domain types
 * (`schoolId: string`, not a nested School object) — every toXxx() mapper in
 * this folder relies on that.
 */

const API_BASE = "/api";

interface PayloadListResponse<T> {
  docs: T[];
}

interface PayloadMutationResponse<T> {
  doc: T;
}

function toQueryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, String(value));
  });
  return search.toString();
}

export async function payloadFind<T>(
  collection: string,
  where: Record<string, string | number> = {},
  extra: Record<string, string | number> = {},
): Promise<T[]> {
  const whereParams: Record<string, string> = {};
  Object.entries(where).forEach(([field, value]) => {
    whereParams[`where[${field}][equals]`] = String(value);
  });
  const query = toQueryString({ depth: 0, limit: 500, ...whereParams, ...extra });
  const res = await fetch(`${API_BASE}/${collection}?${query}`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as PayloadListResponse<T>;
  return data.docs;
}

export async function payloadFindById<T>(collection: string, id: string): Promise<T | null> {
  const res = await fetch(`${API_BASE}/${collection}/${id}?depth=0`, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

interface PayloadErrorResponse {
  errors?: { message?: string }[];
}

async function throwOnError(res: Response, action: string): Promise<void> {
  if (res.ok) return;
  const body = (await res.json().catch(() => null)) as PayloadErrorResponse | null;
  const message = body?.errors?.[0]?.message ?? `${action} failed (${res.status})`;
  throw new Error(message);
}

export async function payloadCreate<T>(collection: string, data: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}/${collection}?depth=0`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await throwOnError(res, `Create ${collection}`);
  const json = (await res.json()) as PayloadMutationResponse<T>;
  return json.doc;
}

export async function payloadUpdate<T>(
  collection: string,
  id: string,
  data: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${API_BASE}/${collection}/${id}?depth=0`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await throwOnError(res, `Update ${collection}`);
  const json = (await res.json()) as PayloadMutationResponse<T>;
  return json.doc;
}

/** Multipart upload for `upload: true` collections (e.g. Media) — Payload's create endpoint accepts a `file` form field. */
export async function payloadUploadFile<T>(collection: string, file: File): Promise<T> {
  const form = new FormData();
  form.set("file", file);
  const res = await fetch(`${API_BASE}/${collection}?depth=0`, { method: "POST", body: form });
  await throwOnError(res, `Upload ${collection}`);
  const json = (await res.json()) as PayloadMutationResponse<T>;
  return json.doc;
}

export async function payloadDelete(collection: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${collection}/${id}`, { method: "DELETE" });
  await throwOnError(res, `Delete ${collection}`);
}

interface PayloadAuthResponse<T> {
  user: T;
}

/** Logs into an `auth: true` collection — Payload sets the session as an HTTP-only cookie on success. */
export async function payloadLogin<T>(
  collection: string,
  credentials: { email: string; password: string } | { username: string; password: string },
): Promise<T> {
  const res = await fetch(`${API_BASE}/${collection}/login?depth=0`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  await throwOnError(res, "Login");
  const json = (await res.json()) as PayloadAuthResponse<T>;
  return json.user;
}

export async function payloadLogout(collection: string): Promise<void> {
  await fetch(`${API_BASE}/${collection}/logout`, { method: "POST" });
}

/** Reads the current session (if any) from the request's auth cookie. Never throws — no session just resolves null. */
export async function payloadMe<T>(collection: string): Promise<T | null> {
  const res = await fetch(`${API_BASE}/${collection}/me?depth=0`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as { user: T | null };
  return json.user ?? null;
}
