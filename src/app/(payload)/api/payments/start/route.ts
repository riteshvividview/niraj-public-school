import { NextResponse } from "next/server";
import { failure, requireStudent } from "@/lib/server/payments/route-helpers";
import { startPayment, toViews } from "@/lib/server/payments/service";
import type { RequestedLine } from "@/lib/server/payments/pricing";

/**
 * Start paying for the cart. The browser sends only WHAT it wants (kind, id, size);
 * prices are re-read from the database. Answers:
 *   200 {status:"started"|"resumed", payment, checkout}  — go and take the money
 *   409 {code:"pending", payment}   — a different payment is still in progress
 *   409 {code:"duplicate", …}       — the same items were just paid for
 */
export async function POST(request: Request) {
  const actor = await requireStudent(request);
  if (actor instanceof Response) return actor;
  const body = await request.json().catch(() => null);
  const lines: RequestedLine[] = Array.isArray(body?.items)
    ? body.items.map((item: Record<string, unknown>) => ({
        kind: item?.kind as RequestedLine["kind"],
        refId: String(item?.refId ?? ""),
        meta: typeof item?.meta === "string" ? item.meta : undefined,
      }))
    : [];
  try {
    const result = await startPayment(actor.payload, actor.user.id, lines);
    if (result.kind === "duplicate") {
      return NextResponse.json(
        { code: "duplicate", error: "You already paid for these items a moment ago.", amount: result.amount, paidAt: result.paidAt, receiptId: result.receiptId, receiptCode: result.receiptCode },
        { status: 409 },
      );
    }
    const [view] = await toViews(actor.payload, [result.payment]);
    if (result.kind === "pending-other") {
      return NextResponse.json({ code: "pending", error: "You have another payment in progress. Finish or cancel it first.", payment: view }, { status: 409 });
    }
    return NextResponse.json({ status: result.kind, payment: view, checkout: result.checkout });
  } catch (error) {
    return failure(error, "start");
  }
}
