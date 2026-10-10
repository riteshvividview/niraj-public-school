"use client";

import { AddressFields, type AddressFieldLabels } from "@/components/shared/address-fields";
import { EMPTY_ADDRESS_DRAFT, missingAddressFields } from "@/lib/address";
import type { AddressDraft } from "@/types";

export const STAFF_ADDRESS_LABELS: AddressFieldLabels = {
  house: "Flat / house no. and building",
  housePlaceholder: "e.g. Flat 4B, Sai Residency",
  street: "Street / area / locality",
  streetPlaceholder: "e.g. Road No. 5, Madhapur",
  landmark: "Landmark (optional)",
  landmarkPlaceholder: "e.g. Near City Hospital",
  city: "City / town",
  state: "State",
  pincode: "Pincode",
  phone: "Delivery contact number",
  phoneHint: "Who the delivery person should call.",
  errors: {
    house: "Enter the flat / house number",
    street: "Enter the street / area",
    city: "Enter the city",
    state: "Enter the state",
    pincode: "Enter the pincode",
    pincodeFormat: "Pincode must be 6 digits",
  },
};

/** True when no address text has been entered (a delivery phone alone isn't an address). */
export function isEmptyAddressDraft(draft: AddressDraft): boolean {
  return [draft.house, draft.street, draft.landmark, draft.city, draft.state, draft.pincode].every((v) => v.trim() === "");
}

/**
 * What to send for an address field in a staff form:
 *   undefined → leave as is (nothing typed, none stored)
 *   null      → remove it (everything cleared)
 *   a draft   → save it
 * or an error message when it's half-filled.
 */
export function resolveAddressDraft(
  draft: AddressDraft,
  hadAddress: boolean,
): { ok: true; address: AddressDraft | null | undefined } | { ok: false; error: string } {
  if (isEmptyAddressDraft(draft)) return { ok: true, address: hadAddress ? null : undefined };
  if (missingAddressFields(draft).length > 0) {
    return { ok: false, error: "Finish the delivery address (all required fields, 6-digit pincode) or clear it completely." };
  }
  return { ok: true, address: draft };
}

export { EMPTY_ADDRESS_DRAFT };

/** Console Add/Edit Student — optional delivery address block. */
export function StaffAddressSection({
  draft,
  onChange,
  idPrefix,
}: {
  draft: AddressDraft;
  onChange: (draft: AddressDraft) => void;
  idPrefix: string;
}) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-line/60 p-3.5">
      <legend className="px-1 text-sm font-medium text-ink">Delivery address (optional)</legend>
      <p className="text-xs text-sub">
        Used when a parent can&apos;t come to collect. Leave everything blank for no address; clear all fields to remove an existing one.
      </p>
      <AddressFields draft={draft} onChange={onChange} labels={STAFF_ADDRESS_LABELS} idPrefix={idPrefix} />
    </fieldset>
  );
}
