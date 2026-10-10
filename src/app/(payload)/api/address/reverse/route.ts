import { NextResponse } from "next/server";
import { getRequestActor, jsonError } from "@/lib/server/request-actor";

/**
 * "Use my live location" — turns the browser's GPS coordinates into a
 * suggested postal address so the parent only has to confirm it and add their
 * flat / house number.
 *
 * Uses OpenStreetMap's public Nominatim service, called from the server (it
 * requires an identifying User-Agent and a gentle request rate, and keeping
 * the call here means the key-less service is never hit straight from
 * parents' phones). The coordinates therefore reach OpenStreetMap; the
 * student-facing dialog says so. Nothing is stored by this route — the
 * address is only saved if the parent confirms it (/api/address/save).
 *
 * Swap the lookup for a paid geocoder (Google / Mappls / Ola) by changing
 * only `lookup()` below if the school outgrows Nominatim's usage policy.
 */

interface Suggestion {
  house?: string;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  displayName?: string;
}

// Best-effort per-instance throttle: 1 lookup / 2 s and 15 / hour per student.
const recent = new Map<string, number[]>();
function throttled(userId: string): boolean {
  const now = Date.now();
  const hits = (recent.get(userId) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  if (hits.length >= 15 || (hits.length > 0 && now - hits[hits.length - 1] < 2000)) {
    recent.set(userId, hits);
    return true;
  }
  hits.push(now);
  recent.set(userId, hits);
  return false;
}

async function lookup(latitude: number, longitude: number): Promise<Suggestion | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "en");

  const res = await fetch(url, {
    headers: {
      "User-Agent": process.env.NOMINATIM_USER_AGENT ?? "NirajPublicSchool-OrderingPlatform/1.0 (school delivery address lookup)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(7000),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { display_name?: string; address?: Record<string, string> } | null;
  const a = data?.address;
  if (!a) return null;

  const street = [a.road, a.neighbourhood ?? a.suburb ?? a.residential ?? a.quarter ?? a.city_district]
    .filter(Boolean)
    .filter((part, i, all) => all.indexOf(part) === i)
    .join(", ");
  return {
    house: a.house_number ?? a.building ?? undefined,
    street: street || undefined,
    city: a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? a.state_district ?? undefined,
    state: a.state ?? undefined,
    pincode: a.postcode ? a.postcode.replace(/\s+/g, "") : undefined,
    displayName: data?.display_name,
  };
}

export async function POST(request: Request) {
  const actor = await getRequestActor(request);
  if (actor.kind !== "student") return jsonError("Please log in first.", 401);

  const body = await request.json().catch(() => null);
  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return jsonError("Those coordinates are not valid.", 400);
  }
  if (throttled(actor.user.id)) return jsonError("Please wait a moment before trying again.", 429);

  try {
    const suggestion = await lookup(latitude, longitude);
    if (!suggestion) return jsonError("We couldn't find an address for that spot.", 404, { reason: "not-found" });
    return NextResponse.json({ ok: true, suggestion });
  } catch (error) {
    console.error("[address/reverse] lookup failed:", error);
    return jsonError("The address lookup is unavailable right now.", 502, { reason: "lookup-failed" });
  }
}
