import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { handleWebhook } from "@/lib/server/payments/service";

/**
 * The payment provider's server-to-server confirmation — this is what settles a
 * payment when the parent's screen never came back (power cut, closed tab). Not
 * logged-in: authenticity is the provider's signature over the raw body. Set this
 * URL (…/api/payments/webhook) in the provider's dashboard.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const payload = await getPayload({ config });
  try {
    const result = await handleWebhook(payload, rawBody, request.headers);
    if (result === "invalid") return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[payments/webhook] failed:", error);
    // 500 makes the provider retry later — right for a transient failure.
    return NextResponse.json({ error: "Could not process the event" }, { status: 500 });
  }
}
