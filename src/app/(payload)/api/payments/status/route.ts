import { NextResponse } from "next/server";
import { getRequestActor, jsonError } from "@/lib/server/request-actor";
import { failure } from "@/lib/server/payments/route-helpers";
import { listStudentPayments, loadPayment, refreshPayment, toViews } from "@/lib/server/payments/service";

/**
 * Where does my payment stand? `?id=` checks one payment with the provider right now
 * (a student only their own; staff any); without `id` it lists the student's own
 * payments, newest first, after checking the one in progress.
 */
export async function GET(request: Request) {
  const actor = await getRequestActor(request);
  if (actor.kind === "anonymous") return jsonError("Please log in to continue.", 401);
  const id = new URL(request.url).searchParams.get("id");
  try {
    if (!id) {
      if (actor.kind !== "student") return jsonError("Pass ?id= to look up a payment.", 400);
      return NextResponse.json({ payments: await listStudentPayments(actor.payload, actor.user.id) });
    }
    const row = await loadPayment(actor.payload, id);
    if (!row || (actor.kind === "student" && row.userId !== actor.user.id)) return jsonError("Payment not found.", 404);
    const fresh = await refreshPayment(actor.payload, row);
    const [view] = await toViews(actor.payload, [fresh], actor.kind === "staff");
    return NextResponse.json({ payment: view });
  } catch (error) {
    return failure(error, "status");
  }
}
