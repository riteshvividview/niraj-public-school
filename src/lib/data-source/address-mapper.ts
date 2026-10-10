import type { Address, AddressDraft } from "@/types";

/** The `address` group as Payload returns it (every field nullable). */
export interface PayloadAddressGroup {
  house?: string | null;
  street?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  source?: "manual" | "live-location" | null;
  updatedAt?: string | null;
}

/** An address is "present" only when it is complete — the database guarantees that, or all-null. */
export function toAddress(group: PayloadAddressGroup | null | undefined): Address | undefined {
  if (!group || !group.house || !group.street || !group.city || !group.state || !group.pincode) return undefined;
  return {
    house: group.house,
    street: group.street,
    landmark: group.landmark ?? undefined,
    city: group.city,
    state: group.state,
    pincode: group.pincode,
    phone: group.phone ?? undefined,
    latitude: group.latitude ?? undefined,
    longitude: group.longitude ?? undefined,
    source: group.source ?? undefined,
    updatedAt: group.updatedAt ?? undefined,
  };
}

/** The payload to PATCH/POST for an address draft; `null` clears it. */
export function toAddressPayload(draft: AddressDraft | null): Record<string, unknown> {
  if (draft === null) {
    return Object.fromEntries(
      ["house", "street", "landmark", "city", "state", "pincode", "phone", "latitude", "longitude", "source"].map((k) => [k, null]),
    );
  }
  return {
    house: draft.house.trim(),
    street: draft.street.trim(),
    landmark: draft.landmark.trim() || null,
    city: draft.city.trim(),
    state: draft.state.trim(),
    pincode: draft.pincode.replace(/\s+/g, ""),
    phone: draft.phone.trim() || null,
    latitude: draft.latitude ?? null,
    longitude: draft.longitude ?? null,
    source: draft.source,
  };
}
