import { NextResponse } from "next/server";
import { failure, requireStudent } from "@/lib/server/payments/route-helpers";
import { cancelPayment, toViews } from "@/lib/server/payments/service";

/** Cancel a payment in progress — only after the provider shows no money arrived (otherwise it becomes a paid order). */
export async function POST(request: Request) {
  const actor = await requireStudent(request);
  if (actor instanceof Response) return actor;
  const body = await request.json().catch(() => null);
  const paymentId = typeof body?.paymentId === "string" ? body.paymentId : "";
  if (!paymentId) return NextResponse.json({ error: "Missing payment." }, { status: 400 });
  try {
    const row = await cancelPayment(actor.payload, actor.user.id, paymentId);
    const [view] = await toViews(actor.payload, [row]);
    return NextResponse.json({ payment: view });
  } catch (error) {
    return failure(error, "cancel");
  }
}
