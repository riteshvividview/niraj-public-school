import config from "@payload-config";
import { createHash, randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { sendTransactionalEmail } from "@/lib/email/brevo";
import { otpEmail } from "@/lib/email/templates";

const OTP_TTL_MS = 10 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;

function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Self-service change-password, step 1 — "who is asking" comes from the
 * session cookie (payload.auth), never a client-supplied id, since Users'
 * own access control is otherwise wide open (see Users.ts's header comment).
 */
export async function POST(request: Request) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const fullUser = await payload.findByID({ collection: "users", id: user.id });
  if (!fullUser.email) {
    return NextResponse.json({ error: "No email on file for this account." }, { status: 400 });
  }

  const otpExpiresAt = fullUser.otpExpiresAt as string | undefined;
  if (otpExpiresAt) {
    const requestedAt = new Date(otpExpiresAt).getTime() - OTP_TTL_MS;
    if (Date.now() - requestedAt < COOLDOWN_MS) {
      return NextResponse.json({ error: "Please wait a bit before requesting another code." }, { status: 429 });
    }
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await payload.update({
    collection: "users",
    id: user.id,
    data: {
      otpCodeHash: hashOtp(code),
      otpExpiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      otpVerifiedAt: null,
    },
  });

  await sendTransactionalEmail({
    to: fullUser.email,
    toName: fullUser.name,
    subject: "Your OTP for password change",
    html: otpEmail(code),
  });

  return NextResponse.json({ ok: true });
}
