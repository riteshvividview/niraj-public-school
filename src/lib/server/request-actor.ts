import config from "@payload-config";
import { getPayload, type Payload } from "payload";

/**
 * Server-only. Who is calling a request route? Payload verifies the
 * `payload-token` cookie (one shared cookie name across auth collections —
 * see src/middleware.ts), and `user.collection` tells us which kind of
 * account it belongs to: `users` = a student/parent, `payload-admins` =
 * school staff (`role` splits administrator vs staff).
 */
export interface ActorUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

export type RequestActor =
  | { kind: "student"; payload: Payload; user: ActorUser }
  | { kind: "staff"; payload: Payload; user: ActorUser }
  | { kind: "anonymous"; payload: Payload };

export async function getRequestActor(request: Request): Promise<RequestActor> {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return { kind: "anonymous", payload };
  if (user.collection === "payload-admins") {
    // A disabled staff account can still hold a valid cookie until it expires — never trust it.
    if ((user as { status?: string }).status === "disabled") return { kind: "anonymous", payload };
    return { kind: "staff", payload, user: user as unknown as ActorUser };
  }
  return { kind: "student", payload, user: user as unknown as ActorUser };
}

/** A relationship field is a plain id at depth 0 and a populated object at depth ≥ 1. */
export function relId(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) return String((value as { id: unknown }).id);
  return "";
}

/**
 * True if a database error (possibly wrapped several layers deep by Payload /
 * drizzle) is a unique-constraint violation. Only call this after the input
 * has been validated, since Payload reports a violation as a generic
 * "field is invalid" ValidationError.
 */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current; depth++) {
    const e = current as { code?: unknown; message?: unknown; cause?: unknown };
    if (e.code === "23505") return true;
    if (typeof e.message === "string" && /duplicate key|unique constraint/i.test(e.message)) return true;
    // Payload's drizzle adapter re-throws a 23505 as a ValidationError naming the offending columns.
    if ((e as { name?: unknown }).name === "ValidationError" && typeof e.message === "string" && /field is invalid/i.test(e.message)) return true;
    current = e.cause;
  }
  return false;
}

export function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return Response.json({ error: message, ...extra }, { status });
}
