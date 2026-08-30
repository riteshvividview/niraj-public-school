import config from "@payload-config";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { sendTransactionalEmail } from "@/lib/email/brevo";
import { consoleLoginOtpEmail } from "@/lib/email/templates";
import { generateOtpCode, hashDeviceToken, hashOtp } from "@/lib/otp";

const OTP_TTL_MS = 10 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;
const DEVICE_COOKIE = "nps-console-device";

interface TrustedDevice {
  id?: string;
  tokenHash: string;
  expiresAt: string;
}

/**
 * Console login, step 1 — validates the password without establishing a
 * session (Payload's Local `login` operation returns a user/token but never
 * touches cookies), then decides whether this browser needs an emailed OTP
 * challenge before the real login (payloadLogin, unchanged) is allowed to
 * proceed. See src/collections/PayloadAdmins.ts for the account model.
 */
export async function POST(request: Request) {
  const payload = await getPayload({ config });
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
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

  if (user.status === "invited") {
    return NextResponse.json(
      { error: "This account hasn't been activated yet — check your email for the invite, or ask an administrator to resend it." },
      { status: 400 },
    );
  }
  if (user.status === "disabled") {
    return NextResponse.json({ error: "This account has been disabled." }, { status: 403 });
  }

  const cookieStore = await cookies();
  const deviceToken = cookieStore.get(DEVICE_COOKIE)?.value;
  const trustedDevices = (user.trustedDevices ?? []) as TrustedDevice[];
  const now = Date.now();
  const matched = deviceToken
    ? trustedDevices.find((d) => d.tokenHash === hashDeviceToken(deviceToken) && new Date(d.expiresAt).getTime() > now)
    : undefined;

  if (matched) {
    await payload.update({
      collection: "payload-admins",
      id: user.id,
      data: { lastLoginAt: new Date().toISOString() },
    });
    return NextResponse.json({ ok: true, requiresOtp: false });
  }

  const otpExpiresAt = user.otpExpiresAt as string | undefined;
  if (otpExpiresAt) {
    const requestedAt = new Date(otpExpiresAt).getTime() - OTP_TTL_MS;
    if (now - requestedAt < COOLDOWN_MS) {
      return NextResponse.json({ ok: true, requiresOtp: true });
    }
  }

  const code = generateOtpCode();
  await payload.update({
    collection: "payload-admins",
    id: user.id,
    data: {
      otpCodeHash: hashOtp(code),
      otpExpiresAt: new Date(now + OTP_TTL_MS).toISOString(),
      otpVerifiedAt: null,
    },
  });

  await sendTransactionalEmail({
    to: email,
    toName: user.name ?? undefined,
    subject: "Your School Console sign-in code",
    html: consoleLoginOtpEmail(code),
  });

  return NextResponse.json({ ok: true, requiresOtp: true });
}
