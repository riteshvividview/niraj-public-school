import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { CLEARED_OTP_FIELDS } from "@/lib/otp";

const VERIFIED_WINDOW_MS = 5 * 60 * 1000;

/** Forgot-password (logged-out), step 3. */
export async function POST(request: Request) {
  const payload = await getPayload({ config });
  const body = await request.json().catch(() => null);
  const registerNumber = typeof body?.registerNumber === "string" ? body.registerNumber.trim() : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  if (!registerNumber) {
    return NextResponse.json({ error: "Enter your register number." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  // See request/route.ts's comment — Payload's username field always stores lowercase.
  const { docs } = await payload.find({
    collection: "users",
    where: { username: { equals: registerNumber.toLowerCase() } },
    limit: 1,
  });
  const user = docs[0];
  if (!user) {
    return NextResponse.json({ error: "That register number doesn't match an account." }, { status: 404 });
  }

  const otpVerifiedAt = user.otpVerifiedAt as string | undefined;
  const isRecent = otpVerifiedAt && Date.now() - new Date(otpVerifiedAt).getTime() < VERIFIED_WINDOW_MS;
  if (!isRecent) {
    return NextResponse.json({ error: "Please verify your OTP again." }, { status: 401 });
  }

  await payload.update({
    collection: "users",
    id: user.id,
    data: { password: newPassword, ...CLEARED_OTP_FIELDS },
  });

  return NextResponse.json({ ok: true });
}
