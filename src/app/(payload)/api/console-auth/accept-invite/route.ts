import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { isOtpValid } from "@/lib/otp";

/** Public — /console/accept-invite. Turns an "invited" row into a real, usable account. */
export async function POST(request: Request) {
  const payload = await getPayload({ config });
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const otp = typeof body?.otp === "string" ? body.otp.trim() : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!email || otp.length !== 6) {
    return NextResponse.json({ error: "Enter your email and the 6-digit code." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const matches = await payload.find({
    collection: "payload-admins",
    where: { and: [{ email: { equals: email } }, { status: { equals: "invited" } }] },
    limit: 1,
  });
  const invited = matches.docs[0];
  if (!invited || !isOtpValid(invited.otpCodeHash as string | undefined, invited.otpExpiresAt as string | undefined, otp)) {
    return NextResponse.json({ error: "That code is incorrect, expired, or already used." }, { status: 400 });
  }

  await payload.update({
    collection: "payload-admins",
    id: invited.id,
    data: {
      password: newPassword,
      status: "active",
      otpCodeHash: null,
      otpExpiresAt: null,
      otpVerifiedAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}
