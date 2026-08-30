import type { ConsoleStaffProfile } from "@/types";
import { payloadFind, payloadLogout, payloadMe, payloadUpdate } from "./payload-rest";

interface PayloadAdminDoc {
  id: string;
  name?: string | null;
  email: string;
  role: ConsoleStaffProfile["role"];
  status: ConsoleStaffProfile["status"];
  invitedByEmail?: string | null;
  invitedAt?: string | null;
  lastLoginAt?: string | null;
}

function toProfile(doc: PayloadAdminDoc): ConsoleStaffProfile {
  return {
    id: doc.id,
    name: doc.name ?? doc.email,
    email: doc.email,
    role: doc.role,
    status: doc.status,
    invitedByEmail: doc.invitedByEmail ?? undefined,
    invitedAt: doc.invitedAt ?? undefined,
    lastLoginAt: doc.lastLoginAt ?? undefined,
  };
}

/** Console — reads the current session from the browser's payload-admins auth cookie. Null if not logged in. */
export async function getCurrentConsoleStaff(): Promise<ConsoleStaffProfile | null> {
  const doc = await payloadMe<PayloadAdminDoc>("payload-admins");
  return doc ? toProfile(doc) : null;
}

export async function logoutConsoleStaff(): Promise<void> {
  await payloadLogout("payload-admins");
}

/** Console Administration — every staff account, for the roster table. */
export async function getConsoleStaffList(): Promise<ConsoleStaffProfile[]> {
  const docs = await payloadFind<PayloadAdminDoc>("payload-admins");
  return docs.map(toProfile).sort((a, b) => a.name.localeCompare(b.name));
}

interface CustomRouteError {
  error?: string;
  retryAfterSeconds?: number;
}

/** Thrown by postJson on a 429 (resend cooldown) — callers can read `retryAfterSeconds` to drive a countdown instead of just showing the message. */
export class CooldownError extends Error {
  retryAfterSeconds: number;
  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

async function postJson(path: string, body: unknown): Promise<void> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as CustomRouteError | null;
    if (res.status === 429 && data?.retryAfterSeconds) {
      throw new CooldownError(data.error ?? "Please wait before trying again.", data.retryAfterSeconds);
    }
    throw new Error(data?.error ?? "Something went wrong.");
  }
}

/** Console Administration — "Add Staff." Re-inviting an already-`invited` email resends its code instead of erroring. */
export async function inviteConsoleStaff(name: string, email: string): Promise<void> {
  await postJson("/api/console-auth/invite", { name, email });
}

export async function resendConsoleStaffInvite(name: string, email: string): Promise<void> {
  await postJson("/api/console-auth/invite", { name, email });
}

export async function setConsoleStaffStatus(id: string, status: "active" | "disabled"): Promise<void> {
  await payloadUpdate("payload-admins", id, { status });
}

export async function setConsoleStaffRole(id: string, role: ConsoleStaffProfile["role"]): Promise<void> {
  await payloadUpdate("payload-admins", id, { role });
}

/** Clears every trusted device on the account — its next login from anywhere requires a fresh OTP. */
export async function forceConsoleStaffReverification(id: string): Promise<void> {
  await payloadUpdate("payload-admins", id, { trustedDevices: [] });
}
