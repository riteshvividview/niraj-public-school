import config from "@payload-config";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { getAppUrl } from "@/lib/app-url";
import { sendTransactionalEmail } from "@/lib/email/brevo";
import { consoleInviteEmail } from "@/lib/email/templates";
import { generateOtpCode, hashOtp } from "@/lib/otp";

const INVITE_OTP_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours — an invite email may sit unread longer than a login code
const RESEND_COOLDOWN_MS = 2 * 60 * 1000; // Brevo (and good sense) won't send the same recipient two emails back-to-back

/** Console Administration — "Add Staff." Administrator-only (checked here, independent of PayloadAdmins.ts's own access.create). */
export async function POST(request: Request) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }
  if (user.collection !== "payload-admins" || (user as { role?: string }).role !== "administrator") {
    return NextResponse.json({ error: "Only an administrator can invite staff." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!name || !email) {
    return NextResponse.json({ error: "Enter a name and email." }, { status: 400 });
  }

  const existing = await payload.find({
    collection: "payload-admins",
    where: { email: { equals: email } },
    limit: 1,
  });
  const existingDoc = existing.docs[0];
  // Re-inviting an email still mid-invite acts as "resend" (fresh code, same
  // row) rather than a hard reject — that's what the Administration tab's
  // "Resend invite" action calls. Anything already active/disabled is a real
  // conflict, though.
  if (existingDoc && existingDoc.status !== "invited") {
    return NextResponse.json({ error: "That email already has console access." }, { status: 409 });
  }

  const now = new Date();
  if (existingDoc?.otpExpiresAt) {
    const requestedAt = new Date(existingDoc.otpExpiresAt as string).getTime() - INVITE_OTP_TTL_MS;
    const elapsed = now.getTime() - requestedAt;
    if (elapsed < RESEND_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return NextResponse.json(
        { error: `Please wait ${retryAfterSeconds}s before resending — email providers block sending the same recipient two messages too quickly.`, retryAfterSeconds },
        { status: 429 },
      );
    }
  }

  const code = generateOtpCode();
  if (existingDoc) {
    await payload.update({
      collection: "payload-admins",
      id: existingDoc.id,
      data: {
        name,
        invitedByEmail: typeof user.email === "string" ? user.email : undefined,
        otpCodeHash: hashOtp(code),
        otpExpiresAt: new Date(now.getTime() + INVITE_OTP_TTL_MS).toISOString(),
      },
    });
  } else {
    await payload.create({
      collection: "payload-admins",
      data: {
        name,
        email,
        password: randomBytes(24).toString("hex"), // never surfaced — reset for real at /console/accept-invite
        role: "staff",
        status: "invited",
        invitedByEmail: typeof user.email === "string" ? user.email : undefined,
        invitedAt: now.toISOString(),
        otpCodeHash: hashOtp(code),
        otpExpiresAt: new Date(now.getTime() + INVITE_OTP_TTL_MS).toISOString(),
      },
    });
  }

  const acceptUrl = `${getAppUrl(request)}/console/accept-invite?email=${encodeURIComponent(email)}`;
  await sendTransactionalEmail({
    to: email,
    toName: name,
    subject: "You've been invited to the School Console",
    html: consoleInviteEmail(code, typeof user.name === "string" ? user.name : "A school administrator", acceptUrl),
  });

  return NextResponse.json({ ok: true });
}
