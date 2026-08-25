import config from "@payload-config";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

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

  const isExpired = !otpExpiresAt || new Date(otpExpiresAt).getTime() < Date.now();
  const isMatch = otpCodeHash && otpCodeHash === hashOtp(otp);
  if (!isMatch || isExpired) {
    return NextResponse.json({ error: "That code is incorrect or has expired." }, { status: 400 });
  }

  await payload.update({
    collection: "users",
    id: user.id,
    data: { otpVerifiedAt: new Date().toISOString() },
  });

  return NextResponse.json({ ok: true });
}
