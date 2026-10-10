import { NextResponse } from "next/server";
import { getRequestActor, jsonError } from "@/lib/server/request-actor";

const TEXT_LIMITS: Record<string, number> = { house: 150, street: 250, landmark: 150, city: 100, state: 100, phone: 20 };

/**
 * A student/parent saves (or removes) their OWN delivery address. Only the
 * logged-in account's own record is ever touched — there is no id in the
 * request. Validation (all-or-nothing completeness, 6-digit pincode, phone,
 * coordinates) lives in the Users collection's beforeChange hook, so the
 * console edit path enforces exactly the same rules.
 *
 * Body: { house, street, landmark?, city, state, pincode, phone?, latitude?, longitude?, source? }
 *    or { remove: true }
 */
export async function POST(request: Request) {
  const actor = await getRequestActor(request);
  if (actor.kind !== "student") return jsonError("Please log in to save your address.", 401);
  const { payload, user } = actor;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError("Invalid request.", 400);

  let address: Record<string, unknown>;
  if (body.remove === true) {
    address = Object.fromEntries(
      ["house", "street", "landmark", "city", "state", "pincode", "phone", "latitude", "longitude", "source"].map((key) => [key, null]),
    );
  } else {
    address = {};
    for (const [key, limit] of Object.entries(TEXT_LIMITS)) {
      const value = body[key];
      if (value === undefined || value === null || value === "") {
        address[key] = null;
      } else if (typeof value !== "string" || value.trim().length > limit) {
        return jsonError(`"${key}" is too long or not valid.`, 400);
      } else {
        address[key] = value.trim();
      }
    }
    const pin = body.pincode;
    address.pincode = pin === undefined || pin === null || pin === "" ? null : String(pin).replace(/\s+/g, "");
    address.latitude = typeof body.latitude === "number" ? body.latitude : null;
    address.longitude = typeof body.longitude === "number" ? body.longitude : null;
    address.source = body.source === "live-location" ? "live-location" : "manual";
  }

  try {
    const updated = await payload.update({
      collection: "users",
      id: user.id,
      data: { address },
      // Run as the student so the activity log records who made the change.
      user: user as never,
      depth: 0,
    });
    return NextResponse.json({ ok: true, address: updated.address ?? null });
  } catch (error) {
    // The Users hook throws friendly, public messages for every validation failure.
    const e = error as { message?: string; status?: number; isPublic?: boolean };
    if (e.isPublic && e.message) return jsonError(e.message, e.status && e.status < 500 ? e.status : 400);
    console.error("[address/save] failed:", error);
    return jsonError("We couldn't save your address. Please try again.", 500);
  }
}
