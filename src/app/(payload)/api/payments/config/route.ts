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
  const missing =
    provider.id === "razorpay"
      ? ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"].filter((name) => !process.env[name])
      : wanted && wanted !== "simulated" && wanted !== "razorpay"
        ? ["PAYMENT_PROVIDER (unknown value)"]
        : [];
  return NextResponse.json({
    ...base,
    missingKeys: missing,
    webhookUrl: `${getAppUrl(request)}/api/payments/webhook`,
    webhookEvents: provider.id === "razorpay" ? ["payment.captured", "order.paid", "payment.failed"] : [],
  });
}
