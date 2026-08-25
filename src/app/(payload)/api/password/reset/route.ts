import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

const VERIFIED_WINDOW_MS = 5 * 60 * 1000;

/**
 * Self-service change-password, step 3. Reuses the exact same write staff's
 * "Reset Password" uses (resetStudentPassword: `{ password }` via update) —
 * just server-side via Local API here, since this route is what's actually
 * gating on OTP verification.
 */
export async function POST(request: Request) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const fullUser = await payload.findByID({ collection: "users", id: user.id });
  const otpVerifiedAt = fullUser.otpVerifiedAt as string | undefined;
  const isRecent = otpVerifiedAt && Date.now() - new Date(otpVerifiedAt).getTime() < VERIFIED_WINDOW_MS;
  if (!isRecent) {
    return NextResponse.json({ error: "Please verify your OTP again." }, { status: 401 });
  }

  await payload.update({
    collection: "users",
    id: user.id,
    data: { password: newPassword, otpCodeHash: null, otpExpiresAt: null, otpVerifiedAt: null },
  });

  return NextResponse.json({ ok: true });
}
