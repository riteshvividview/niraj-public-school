import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { CLEARED_OTP_FIELDS, isOtpExpired, isOtpValid } from "@/lib/otp";

/** Self-service change-password, step 2. */
export async function POST(request: Request) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const otp = typeof body?.otp === "string" ? body.otp.trim() : "";
  if (otp.length !== 6) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  const fullUser = await payload.findByID({ collection: "users", id: user.id });
  const otpCodeHash = fullUser.otpCodeHash as string | undefined;
  const otpExpiresAt = fullUser.otpExpiresAt as string | undefined;

  // A code past its 10-minute window is purged from the record right here —
  // not just rejected — so an expired hash never lingers in the database
  // waiting to be overwritten by the next request.
  if (isOtpExpired(otpExpiresAt)) {
    if (otpCodeHash) {
      await payload.update({ collection: "users", id: user.id, data: CLEARED_OTP_FIELDS });
    }
    return NextResponse.json({ error: "That code is incorrect or has expired." }, { status: 400 });
  }

  if (!isOtpValid(otpCodeHash, otpExpiresAt, otp)) {
    return NextResponse.json({ error: "That code is incorrect or has expired." }, { status: 400 });
  }

  await payload.update({
    collection: "users",
    id: user.id,
    data: { otpVerifiedAt: new Date().toISOString() },
  });

  return NextResponse.json({ ok: true });
}
