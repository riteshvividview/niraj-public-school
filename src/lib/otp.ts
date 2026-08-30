import { createHash, randomBytes, randomInt } from "node:crypto";

/** Shared by every OTP flow (parent password-change, console login, console invite) — same hashing, same 6-digit shape. */
export function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function isOtpValid(storedHash: string | undefined | null, expiresAt: string | undefined | null, submitted: string): boolean {
  if (!storedHash || !expiresAt) return false;
  if (new Date(expiresAt).getTime() < Date.now()) return false;
  return storedHash === hashOtp(submitted);
}

/** True once expiresAt has passed (or was never set) — used to tell a stale/expired code apart from a merely wrong one, so callers can purge it from the DB instead of just rejecting the attempt. */
export function isOtpExpired(expiresAt: string | undefined | null): boolean {
  return !expiresAt || new Date(expiresAt).getTime() < Date.now();
}

/** Fields to null out to purge a spent or expired OTP from a record — spread into a payload.update's data. */
export const CLEARED_OTP_FIELDS = { otpCodeHash: null, otpExpiresAt: null, otpVerifiedAt: null } as const;

/** A trusted-device token — raw value goes in the cookie, only the hash is ever stored. */
export function generateDeviceToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
