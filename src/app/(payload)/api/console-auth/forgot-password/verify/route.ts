import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { isOtpExpired, isOtpValid } from "@/lib/otp";

/**
 * Console forgot-password (logged-out), step 2. Unlike the parent flow,
 * a correct code clears otpCodeHash/otpExpiresAt immediately (not just on
 * final reset) — the code itself can never be reused once verified.
 * otpVerifiedAt is stamped as a short-lived "may now set a new password"
 * marker, re-checked by reset/route.ts.
 */
export async function POST(request: Request) {
  const payload = await getPayload({ config });
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const otp = typeof body?.otp === "string" ? body.otp.trim() : "";
  if (!email || otp.length !== 6) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  const { docs } = await payload.find({ collection: "payload-admins", where: { email: { equals: email } }, limit: 1 });
  const user = docs[0];
  if (!user) {
    return NextResponse.json({ error: "That code is incorrect or has expired." }, { status: 400 });
  }

  if (isOtpExpired(user.otpExpiresAt as string | undefined)) {
    if (user.otpCodeHash) {
      await payload.update({
        collection: "payload-admins",
        id: user.id,
        data: { otpCodeHash: null, otpExpiresAt: null, otpVerifiedAt: null },
      });
    }
    return NextResponse.json({ error: "That code is incorrect or has expired." }, { status: 400 });
  }

  if (!isOtpValid(user.otpCodeHash as string | undefined, user.otpExpiresAt as string | undefined, otp)) {
    return NextResponse.json({ error: "That code is incorrect or has expired." }, { status: 400 });
  }

  await payload.update({
    collection: "payload-admins",
    id: user.id,
    data: { otpCodeHash: null, otpExpiresAt: null, otpVerifiedAt: new Date().toISOString() },
  });

  return NextResponse.json({ ok: true });
}
