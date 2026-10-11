import { getRequestActor, jsonError, type RequestActor } from "@/lib/server/request-actor";
import { PaymentError } from "./service";
import { CartError } from "./pricing";

/** Server-only helpers shared by the /api/payments/* route handlers. */

export async function requireStudent(request: Request): Promise<Extract<RequestActor, { kind: "student" }> | Response> {
  const actor = await getRequestActor(request);
  if (actor.kind !== "student") return jsonError("Please log in to continue.", 401);
  return actor;
}

export async function requireStaff(request: Request): Promise<Extract<RequestActor, { kind: "staff" }> | Response> {
  const actor = await getRequestActor(request);
  if (actor.kind !== "staff") return jsonError("Only school staff can do this.", 403);
  return actor;
}

/** Turns the payment layer's errors into friendly JSON; anything unexpected becomes a generic 500 (logged). */
export function failure(error: unknown, label: string): Response {
  if (error instanceof PaymentError) return jsonError(error.message, error.status, error.extra);
  if (error instanceof CartError) return jsonError(error.message, error.status, { code: "cart" });
  console.error(`[payments/${label}] unexpected error:`, error);
  return jsonError("Something went wrong. Nothing has been charged. Please try again.", 500);
}
