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
  const isHdfc = provider.id === "hdfc";
  // Without these, online payments are switched off.
  const missing = isHdfc
    ? ["HDFC_API_KEY", "HDFC_MERCHANT_ID", "HDFC_PAYMENT_PAGE_CLIENT_ID"].filter((name) => !process.env[name])
    : wanted && wanted !== "simulated" && wanted !== "hdfc"
      ? ["PAYMENT_PROVIDER (unknown value)"]
      : [];
  // Payments still work without these, but a payment whose screen closed can then only be settled by a status check.
  const webhookMissing = isHdfc ? ["HDFC_WEBHOOK_USERNAME", "HDFC_WEBHOOK_PASSWORD"].filter((name) => !process.env[name]) : [];
  return NextResponse.json({
    ...base,
    missingKeys: missing,
    webhookMissing,
    webhookUrl: `${getAppUrl(request)}/api/payments/webhook`,
    sandbox: isHdfc && /hdfcuat|sandbox|uat/i.test(process.env.HDFC_BASE_URL ?? ""),
    webhookNote: isHdfc
      ? "In the HDFC SmartGateway dashboard (Settings → Webhooks) add this URL, choose Basic authentication with the same username and password as HDFC_WEBHOOK_USERNAME / HDFC_WEBHOOK_PASSWORD, and enable the order events (ORDER_SUCCEEDED, ORDER_FAILED and the other order events)."
      : "",
  });
}
