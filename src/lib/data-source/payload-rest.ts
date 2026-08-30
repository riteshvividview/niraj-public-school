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

/**
 * `payloadFind`'s default page size — every "whole collection" data-source
 * call (students, receipts, orders, stock…) relies on this being large
 * enough to actually be "everything." Payload silently truncates past
 * `limit`; `warnIfTruncated` below turns that into a loud console warning
 * instead of a quietly-wrong dashboard once a school's data outgrows this.
 */
const DEFAULT_FIND_LIMIT = 2000;

interface PayloadListResponse<T> {
  docs: T[];
  totalDocs: number;
}

function warnIfTruncated(collection: string, data: PayloadListResponse<unknown>, limit: number): void {
  if (data.totalDocs > data.docs.length && data.docs.length >= limit) {
    console.warn(
      `[payloadFind] "${collection}" has ${data.totalDocs} docs but only ${data.docs.length} were fetched (limit=${limit}) — results are silently truncated. Raise the limit or switch this call site to payloadFindPage.`,
    );
  }
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
  const limit = typeof extra.limit === "number" ? extra.limit : DEFAULT_FIND_LIMIT;
  const query = toQueryString({ depth: 0, limit, ...whereParams, ...extra });
  const res = await fetch(`${API_BASE}/${collection}?${query}`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as PayloadListResponse<T>;
  warnIfTruncated(collection, data, limit);
  return data.docs;
}

export interface PayloadPage<T> {
  docs: T[];
  totalDocs: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/** Recursively flattens a Payload `where` clause object into bracket-notation query params, e.g. `{ and: [{ school: { equals: "x" } }] }` -> `where[and][0][school][equals]=x`. */
function appendWhereParams(search: URLSearchParams, prefix: string, value: unknown): void {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => appendWhereParams(search, `${prefix}[${i}]`, item));
  } else if (typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, v]) => {
      appendWhereParams(search, `${prefix}[${key}]`, v);
    });
  } else {
    search.set(prefix, String(value));
  }
}

/**
 * Paginated + filtered variant of payloadFind, for collections that can grow
 * large (students, receipts) — server does the filtering (via a Payload
 * `where` clause, including dot-path relation queries like
 * `{ "order.paymentMethod": { equals: "upi" } }`) and the paging, so the
 * client only ever transfers one page of results instead of the whole
 * collection.
 */
export async function payloadFindPage<T>(
  collection: string,
  options: {
    where?: Record<string, unknown>;
    page?: number;
    limit?: number;
    sort?: string;
    depth?: number;
  } = {},
): Promise<PayloadPage<T>> {
  const search = new URLSearchParams();
  search.set("depth", String(options.depth ?? 0));
  search.set("limit", String(options.limit ?? 20));
  search.set("page", String(options.page ?? 1));
  if (options.sort) search.set("sort", options.sort);
  if (options.where) appendWhereParams(search, "where", options.where);
  const res = await fetch(`${API_BASE}/${collection}?${search.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    return { docs: [], totalDocs: 0, page: 1, totalPages: 0, hasNextPage: false, hasPrevPage: false };
  }
  const data = (await res.json()) as PayloadPage<T> & PayloadListResponse<T>;
  return {
    docs: data.docs,
    totalDocs: data.totalDocs,
    page: data.page,
    totalPages: data.totalPages,
    hasNextPage: data.hasNextPage,
    hasPrevPage: data.hasPrevPage,
  };
}

export async function payloadFindById<T>(collection: string, id: string, depth = 0): Promise<T | null> {
  const res = await fetch(`${API_BASE}/${collection}/${id}?depth=${depth}`, { cache: "no-store" });
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
