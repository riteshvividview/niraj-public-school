import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

const VERIFIED_WINDOW_MS = 5 * 60 * 1000;

/** Console forgot-password (logged-out), step 3. */
export async function POST(request: Request) {
  const payload = await getPayload({ config });
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  if (!email) {
    return NextResponse.json({ error: "Enter your email." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const { docs } = await payload.find({ collection: "payload-admins", where: { email: { equals: email } }, limit: 1 });
  const user = docs[0];
  if (!user) {
    return NextResponse.json({ error: "No account found with that email." }, { status: 404 });
  }

  const otpVerifiedAt = user.otpVerifiedAt as string | undefined;
  const isRecent = otpVerifiedAt && Date.now() - new Date(otpVerifiedAt).getTime() < VERIFIED_WINDOW_MS;
  if (!isRecent) {
    return NextResponse.json({ error: "Please verify your code again." }, { status: 401 });
  }

  await payload.update({
    collection: "payload-admins",
    id: user.id,
    data: { password: newPassword, otpVerifiedAt: null },
  });

  return NextResponse.json({ ok: true });
}
