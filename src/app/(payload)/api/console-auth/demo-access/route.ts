import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

const MIN_PASSWORD_LENGTH = 6;

async function requireAdmin(request: Request) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) {
    return { payload, error: NextResponse.json({ error: "Not logged in." }, { status: 401 }) };
  }
  if (user.collection !== "payload-admins" || (user as { role?: string }).role !== "administrator") {
    return { payload, error: NextResponse.json({ error: "Only an administrator can manage shared demo access." }, { status: 403 }) };
  }
  return { payload, error: null };
}

async function findSharedDemoAccount(payload: Awaited<ReturnType<typeof getPayload>>) {
  const result = await payload.find({
    collection: "payload-admins",
    where: { isSharedDemoAccount: { equals: true } },
    limit: 1,
  });
  return result.docs[0] ?? null;
}

/** Console Administration — "Shared Demo Access" card. Whether a shared instant-access credential is currently configured. */
export async function GET(request: Request) {
  const { payload, error } = await requireAdmin(request);
  if (error) return error;

  const existing = await findSharedDemoAccount(payload);
  return NextResponse.json({
    configured: Boolean(existing),
    id: existing?.id,
    email: existing?.email,
    status: existing?.status,
  });
}

/** Set (create or replace) the single shared instant-access credential. */
export async function POST(request: Request) {
  const { payload, error } = await requireAdmin(request);
  if (error) return error;

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "Enter an email and password." }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` }, { status: 400 });
  }

  const existing = await findSharedDemoAccount(payload);
  try {
    if (existing) {
      await payload.update({
        collection: "payload-admins",
        id: existing.id,
        data: { email, password, role: "staff", status: "active", isSharedDemoAccount: true },
      });
    } else {
      await payload.create({
        collection: "payload-admins",
        data: { name: "Shared Demo Access", email, password, role: "staff", status: "active", isSharedDemoAccount: true },
      });
    }
  } catch {
    return NextResponse.json({ error: "That email is already used by another account." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, email });
}

/** Revoke the shared instant-access credential entirely (idempotent if none exists). */
export async function DELETE(request: Request) {
  const { payload, error } = await requireAdmin(request);
  if (error) return error;

  const existing = await findSharedDemoAccount(payload);
  if (existing) {
    await payload.delete({ collection: "payload-admins", id: existing.id });
  }
  return NextResponse.json({ ok: true });
}
