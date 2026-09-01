import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { sendTransactionalEmail } from "@/lib/email/brevo";
import { consoleForgotPasswordOtpEmail } from "@/lib/email/templates";
import { generateOtpCode, hashOtp, maskEmail } from "@/lib/otp";

const OTP_TTL_MS = 10 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;

/** Console forgot-password (logged-out), step 1 — identity is the account's own email, unlike the parent flow's register number. */
export async function POST(request: Request) {
  const payload = await getPayload({ config });
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "Enter your email." }, { status: 400 });
  }

  const { docs } = await payload.find({ collection: "payload-admins", where: { email: { equals: email } }, limit: 1 });
  const user = docs[0];
  if (!user) {
    return NextResponse.json({ error: "No account found with that email." }, { status: 404 });
  }
  if (user.status === "invited") {
    return NextResponse.json(
      { error: "This account hasn't been activated yet — use the invite link in your email instead." },
      { status: 400 },
    );
  }
  if (user.status === "disabled") {
    return NextResponse.json({ error: "This account has been disabled." }, { status: 403 });
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
    collection: "payload-admins",
    id: user.id,
    data: {
      otpCodeHash: hashOtp(code),
      otpExpiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      otpVerifiedAt: null,
    },
  });

  await sendTransactionalEmail({
    to: email,
    toName: typeof user.name === "string" ? user.name : undefined,
    subject: "Your School Console password reset code",
    html: consoleForgotPasswordOtpEmail(code),
  });

  return NextResponse.json({ ok: true, maskedEmail: maskEmail(email) });
}
