import type { Address, AddressDraft } from "@/types";

export const PINCODE_PATTERN = /^[1-9][0-9]{5}$/;

export const EMPTY_ADDRESS_DRAFT: AddressDraft = {
  house: "",
  street: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  phone: "",
  source: "manual",
};

export function draftFromAddress(address: Address | undefined, fallbackPhone?: string): AddressDraft {
  if (!address) return { ...EMPTY_ADDRESS_DRAFT, phone: fallbackPhone ?? "" };
  return {
    house: address.house,
    street: address.street,
    landmark: address.landmark ?? "",
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    phone: address.phone ?? fallbackPhone ?? "",
    latitude: address.latitude,
    longitude: address.longitude,
    source: address.source ?? "manual",
  };
}

/** What is still missing for a deliverable address (empty array = good to save). Messages are for the caller to translate. */
export function missingAddressFields(draft: AddressDraft): Array<"house" | "street" | "city" | "state" | "pincode" | "pincodeFormat"> {
  const missing: Array<"house" | "street" | "city" | "state" | "pincode" | "pincodeFormat"> = [];
  if (!draft.house.trim()) missing.push("house");
  if (!draft.street.trim()) missing.push("street");
  if (!draft.city.trim()) missing.push("city");
  if (!draft.state.trim()) missing.push("state");
  if (!draft.pincode.trim()) missing.push("pincode");
  else if (!PINCODE_PATTERN.test(draft.pincode.trim())) missing.push("pincodeFormat");
  return missing;
}

/** "Flat 4B, Sai Residency, Madhapur, Hyderabad, Telangana - 500081" — one line, for lists and CSVs. */
export function formatAddress(address: Address | undefined | null): string {
  if (!address) return "";
  const lines = [address.house, address.street, address.landmark ? `Near ${address.landmark}` : "", address.city, address.state]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
  return address.pincode ? `${lines} - ${address.pincode}` : lines;
}

/** Same address as separate lines, for detail views. */
export function addressLines(address: Address | undefined | null): string[] {
  if (!address) return [];
  return [
    address.house,
    address.street,
    address.landmark ? `Near ${address.landmark}` : "",
    `${address.city}, ${address.state} - ${address.pincode}`,
  ].filter((line) => line.trim() !== "");
}

/** A Google Maps link: exact pin when the address came from live location, otherwise a search for the typed address. */
export function mapsLink(address: Address): string {
  if (address.latitude !== undefined && address.longitude !== undefined) {
    return `https://www.google.com/maps?q=${address.latitude},${address.longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatAddress(address))}`;
}
