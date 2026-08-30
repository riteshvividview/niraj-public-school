import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { isOtpValid } from "@/lib/otp";

/** Forgot-password (logged-out), step 2. */
export async function POST(request: Request) {
  const payload = await getPayload({ config });
  const body = await request.json().catch(() => null);
  const registerNumber = typeof body?.registerNumber === "string" ? body.registerNumber.trim() : "";
  const otp = typeof body?.otp === "string" ? body.otp.trim() : "";
  if (!registerNumber || otp.length !== 6) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  const { docs } = await payload.find({
    collection: "users",
    where: { username: { equals: registerNumber } },
    limit: 1,
  });
  const user = docs[0];
  if (!user || !isOtpValid(user.otpCodeHash as string | undefined, user.otpExpiresAt as string | undefined, otp)) {
    return NextResponse.json({ error: "That code is incorrect or has expired." }, { status: 400 });
  }

  await payload.update({
    collection: "users",
    id: user.id,
    data: { otpVerifiedAt: new Date().toISOString() },
  });

  return NextResponse.json({ ok: true });
}
