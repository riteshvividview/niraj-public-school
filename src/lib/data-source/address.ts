import type { Address, AddressDraft } from "@/types";
import { toAddress, type PayloadAddressGroup } from "./address-mapper";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as ({ error?: string; reason?: string } & T) | null;
  if (!res.ok) {
    const error = new Error(data?.error ?? "Something went wrong. Please try again.") as Error & { reason?: string };
    error.reason = data?.reason;
    throw error;
  }
  return data as T;
}

/** Student — saves their own delivery address (validated server-side). Returns what was stored. */
export async function saveMyAddress(draft: AddressDraft): Promise<Address | undefined> {
  const result = await postJson<{ address: PayloadAddressGroup | null }>("/api/address/save", {
    house: draft.house,
    street: draft.street,
    landmark: draft.landmark,
    city: draft.city,
    state: draft.state,
    pincode: draft.pincode,
    phone: draft.phone,
    latitude: draft.latitude,
    longitude: draft.longitude,
    source: draft.source,
  });
  return toAddress(result.address);
}

export async function removeMyAddress(): Promise<void> {
  await postJson("/api/address/save", { remove: true });
}

export interface AddressSuggestion {
  house?: string;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  displayName?: string;
}

/** Student — turns GPS coordinates into a suggested address the parent then confirms and completes. */
export async function suggestAddressFromLocation(latitude: number, longitude: number): Promise<AddressSuggestion> {
  const result = await postJson<{ suggestion: AddressSuggestion }>("/api/address/reverse", { latitude, longitude });
  return result.suggestion;
}
