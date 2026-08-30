import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { generateDeviceToken, hashDeviceToken, isOtpValid } from "@/lib/otp";

const DEVICE_COOKIE = "nps-console-device";
const DEVICE_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

/**
 * Console login, step 2 — verifies the emailed code, then marks this browser
 * trusted (so future logins skip the OTP challenge) via a new cookie the app
 * fully owns (not Payload's own session cookie — see precheck/route.ts).
 * The client still has to call payloadLogin itself afterward to actually
 * establish the real Payload session; this route only clears the way for it.
 */
export async function POST(request: Request) {
  const payload = await getPayload({ config });
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const otp = typeof body?.otp === "string" ? body.otp.trim() : "";
  if (!email || !password || otp.length !== 6) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  let result;
  try {
    result = await payload.login({ collection: "payload-admins", data: { email, password } });
  } catch {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }
  const user = result.user;
  if (!user) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  if (!isOtpValid(user.otpCodeHash as string | undefined, user.otpExpiresAt as string | undefined, otp)) {
    return NextResponse.json({ error: "That code is incorrect or has expired." }, { status: 400 });
  }

  const deviceToken = generateDeviceToken();
  const now = new Date();
  const existingDevices = Array.isArray(user.trustedDevices) ? user.trustedDevices : [];

  await payload.update({
    collection: "payload-admins",
    id: user.id,
    data: {
      otpCodeHash: null,
      otpExpiresAt: null,
      otpVerifiedAt: now.toISOString(),
      lastLoginAt: now.toISOString(),
      trustedDevices: [
        ...existingDevices,
        {
          tokenHash: hashDeviceToken(deviceToken),
          label: "Verified device",
          createdAt: now.toISOString(),
          lastUsedAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + DEVICE_TTL_MS).toISOString(),
        },
      ],
    },
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEVICE_COOKIE, deviceToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEVICE_TTL_MS / 1000,
  });
  return response;
}
