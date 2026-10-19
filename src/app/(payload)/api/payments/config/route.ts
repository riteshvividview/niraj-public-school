import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/app-url";
import { getActiveProvider } from "@/lib/server/payments/providers";
import { getRequestActor, jsonError } from "@/lib/server/request-actor";

/**
 * Which payment provider is live. Students get just what checkout needs; staff also
 * get what the school must set up (missing keys, the webhook address to paste into
 * the provider's dashboard) — never the key values themselves.
 */
export async function GET(request: Request) {
  const actor = await getRequestActor(request);
  if (actor.kind === "anonymous") return jsonError("Please log in to continue.", 401);
  const provider = getActiveProvider();
  const base = { provider: provider.id, label: provider.label, testMode: provider.testMode, available: provider.isConfigured() };
  if (actor.kind !== "staff") return NextResponse.json(base);

  const wanted = (process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase();
  const isRazorpay = provider.id === "razorpay";
  // Without these, online payments are switched off.
  const missing = isRazorpay
    ? ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"].filter((name) => !process.env[name])
    : wanted && wanted !== "simulated" && wanted !== "razorpay"
      ? ["PAYMENT_PROVIDER (unknown value)"]
      : [];
  // Payments still work without this, but a payment whose screen closed can then only be settled by a status check.
  const webhookMissing = isRazorpay ? ["RAZORPAY_WEBHOOK_SECRET"].filter((name) => !process.env[name]) : [];
  return NextResponse.json({
    ...base,
    missingKeys: missing,
    webhookMissing,
    webhookUrl: `${getAppUrl(request)}/api/payments/webhook`,
    sandbox: isRazorpay && (process.env.RAZORPAY_KEY_ID ?? "").startsWith("rzp_test_"),
    webhookNote: isRazorpay
      ? "In the Razorpay Dashboard (Account & Settings > Webhooks > Add new webhook) paste this URL, type a secret and put the same secret in RAZORPAY_WEBHOOK_SECRET, and tick the events payment.captured, payment.failed and order.paid."
      : "",
  });
}
