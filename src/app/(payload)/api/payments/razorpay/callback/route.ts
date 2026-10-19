import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/app-url";

/**
 * Razorpay's hosted checkout POSTs the parent here when they finish (or fail) paying. Nothing is trusted
 * or settled here — it only sends the browser on, as a normal page visit (303 → GET), to /checkout/return,
 * which asks the server, and so Razorpay, what really happened. Not logged-in on purpose: the POST comes
 * from Razorpay's page, and the login cookie is only sent again on the redirect.
 */
export async function POST(request: Request) {
  const paymentId = new URL(request.url).searchParams.get("payment") ?? "";
  const target = new URL("/checkout/return", getAppUrl(request));
  if (/^[0-9a-fA-F-]{36}$/.test(paymentId)) target.searchParams.set("payment", paymentId);
  return NextResponse.redirect(target, 303);
}

/** A parent who reloads the callback address lands in the same place. */
export async function GET(request: Request) {
  return POST(request);
}
