import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { sendTransactionalEmail } from "@/lib/email/brevo";
import { otpEmail } from "@/lib/email/templates";
import { generateOtpCode, hashOtp } from "@/lib/otp";

const OTP_TTL_MS = 10 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;

/** Masks an email for display before the user has proven they own the account, e.g. "riya@gmail.com" -> "ri**@gmail.com". */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(local.length - visible.length, 2))}@${domain}`;
}

/**
 * Forgot-password (logged-out), step 1 — unlike the profile's own
 * change-password flow (src/app/(payload)/api/otp/request), there's no
 * session here, so identity comes from the register number the user types
 * in, looked up via Payload's Local API. The Users collection's access is
 * already wide open (see Users.ts's header comment), so this is no more of
 * a gap than every other console-writable path on this collection today.
 */
export async function POST(request: Request) {
  const payload = await getPayload({ config });
  const body = await request.json().catch(() => null);
  const registerNumber = typeof body?.registerNumber === "string" ? body.registerNumber.trim() : "";
  if (!registerNumber) {
    return NextResponse.json({ error: "Enter your register number." }, { status: 400 });
  }

  const { docs } = await payload.find({
    collection: "users",
    where: { username: { equals: registerNumber } },
    limit: 1,
  });
  const user = docs[0];
  if (!user) {
    return NextResponse.json({ error: "That register number doesn't match an account." }, { status: 404 });
  }
  if (!user.email) {
    return NextResponse.json(
      { error: "No email on file for this account — contact the school office to add one." },
      { status: 400 },
    );
  }

  const otpExpiresAt = user.otpExpiresAt as string | undefined;
  if (otpExpiresAt) {
    const requestedAt = new Date(otpExpiresAt).getTime() - OTP_TTL_MS;
    if (Date.now() - requestedAt < COOLDOWN_MS) {
      return NextResponse.json({ error: "Please wait a bit before requesting another code." }, { status: 429 });
    }
  }

  const code = generateOtpCode();
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
    to: user.email,
    toName: user.name,
    subject: "Your OTP to reset your password",
    html: otpEmail(code),
  });

  return NextResponse.json({ ok: true, maskedEmail: maskEmail(user.email) });
}
