import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getActiveProvider } from "@/lib/server/payments/providers";
import { failure, requireStudent } from "@/lib/server/payments/route-helpers";
import { confirmFromBrowser, loadPayment, toViews } from "@/lib/server/payments/service";
import { jsonError } from "@/lib/server/request-actor";

/**
 * TEST MODE ONLY — plays the part of the payment gateway while no real provider is
 * connected. Refuses to run once a real provider is live. Outcomes:
 *   success        money taken and the screen confirms (the normal path)
 *   failure        the (test) payment is declined
 *   confirm-later  money taken but the screen "died" — nothing settles until a status
 *                  check / My payments refresh, exactly like a webhook arriving late
 */
export async function POST(request: Request) {
  if (!getActiveProvider().testMode) return jsonError("Not available.", 404);
  const actor = await requireStudent(request);
  if (actor instanceof Response) return actor;
  const body = await request.json().catch(() => null);
  const paymentId = typeof body?.paymentId === "string" ? body.paymentId : "";
  const outcome = body?.outcome as string;
  const method = ["upi", "card", "netbanking"].includes(body?.method) ? (body.method as string) : "upi";
  if (!paymentId || !["success", "failure", "confirm-later"].includes(outcome)) return jsonError("Bad request.", 400);

  try {
    const row = await loadPayment(actor.payload, paymentId);
    if (!row || row.userId !== actor.user.id || row.provider !== "simulated") return jsonError("Payment not found.", 404);
    if (row.status !== "pending") return NextResponse.json({ payment: (await toViews(actor.payload, [row]))[0] });

    const ref = `${outcome === "failure" ? "sim_fail_" : "sim_ok_"}${randomBytes(6).toString("hex")}`;
    const pool = (actor.payload.db as unknown as { pool: { query: (t: string, v: unknown[]) => Promise<unknown> } }).pool;
    await pool.query(`UPDATE payments SET provider_payment_id = $2, method = $3, updated_at = now() WHERE id = $1 AND status = 'pending'`, [row.id, ref, method]);

    if (outcome === "confirm-later") {
      const [view] = await toViews(actor.payload, [(await loadPayment(actor.payload, row.id))!]);
      return NextResponse.json({ payment: view, note: "Money taken at the gateway; not yet confirmed to the app." });
    }
    const settled = await confirmFromBrowser(actor.payload, actor.user.id, row.id, {});
    const [view] = await toViews(actor.payload, [settled]);
    return NextResponse.json({ payment: view });
  } catch (error) {
    return failure(error, "simulate");
  }
}
