import { NextResponse } from "next/server";
import { failure, requireStudent } from "@/lib/server/payments/route-helpers";
import { confirmFromBrowser, toViews } from "@/lib/server/payments/service";

/**
 * The payment screen reports that the provider's checkout finished. The claim is
 * VERIFIED (signature + a lookup at the provider) before anything is issued; if it
 * can't be verified yet, the payment stays pending and the webhook / status check
 * settles it.
 */
export async function POST(request: Request) {
  const actor = await requireStudent(request);
  if (actor instanceof Response) return actor;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const paymentId = typeof body?.paymentId === "string" ? body.paymentId : "";
  if (!paymentId) return NextResponse.json({ error: "Missing payment." }, { status: 400 });
  try {
    const row = await confirmFromBrowser(actor.payload, actor.user.id, paymentId, body ?? {});
    const [view] = await toViews(actor.payload, [row]);
    return NextResponse.json({ payment: view });
  } catch (error) {
    return failure(error, "confirm");
  }
}
