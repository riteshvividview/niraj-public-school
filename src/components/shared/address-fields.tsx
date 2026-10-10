"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { missingAddressFields } from "@/lib/address";
import type { AddressDraft } from "@/types";

export interface AddressFieldLabels {
  house: string;
  housePlaceholder: string;
  street: string;
  streetPlaceholder: string;
  landmark: string;
  landmarkPlaceholder: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  phoneHint?: string;
  errors: { house: string; street: string; city: string; state: string; pincode: string; pincodeFormat: string };
}

/**
 * The delivery-address inputs, shared by the student's Profile dialog
 * (translated labels) and the console's Add/Edit Student forms (English
 * labels) so both collect exactly the same fields. `showErrors` reveals
 * which required field is still empty.
 */
export function AddressFields({
  draft,
  onChange,
  labels,
  idPrefix,
  showErrors = false,
}: {
  draft: AddressDraft;
  onChange: (next: AddressDraft) => void;
  labels: AddressFieldLabels;
  idPrefix: string;
  showErrors?: boolean;
}) {
  const missing = new Set(showErrors ? missingAddressFields(draft) : []);
  const set = <K extends keyof AddressDraft>(key: K, value: AddressDraft[K]) => onChange({ ...draft, [key]: value });
  const error = (key: "house" | "street" | "city" | "state") =>
    missing.has(key) ? <p className="text-xs text-destructive">{labels.errors[key]}</p> : null;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-house`}>{labels.house}</Label>
        <Input
          id={`${idPrefix}-house`}
          value={draft.house}
          maxLength={150}
          autoComplete="address-line1"
          placeholder={labels.housePlaceholder}
          aria-invalid={missing.has("house")}
          onChange={(e) => set("house", e.target.value)}
        />
        {error("house")}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-street`}>{labels.street}</Label>
        <Input
          id={`${idPrefix}-street`}
          value={draft.street}
          maxLength={250}
          autoComplete="address-line2"
          placeholder={labels.streetPlaceholder}
          aria-invalid={missing.has("street")}
          onChange={(e) => set("street", e.target.value)}
        />
        {error("street")}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-landmark`}>{labels.landmark}</Label>
        <Input
          id={`${idPrefix}-landmark`}
          value={draft.landmark}
          maxLength={150}
          placeholder={labels.landmarkPlaceholder}
          onChange={(e) => set("landmark", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-city`}>{labels.city}</Label>
          <Input
            id={`${idPrefix}-city`}
            value={draft.city}
            maxLength={100}
            autoComplete="address-level2"
            aria-invalid={missing.has("city")}
            onChange={(e) => set("city", e.target.value)}
          />
          {error("city")}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-state`}>{labels.state}</Label>
          <Input
            id={`${idPrefix}-state`}
            value={draft.state}
            maxLength={100}
            autoComplete="address-level1"
            aria-invalid={missing.has("state")}
            onChange={(e) => set("state", e.target.value)}
          />
          {error("state")}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-pincode`}>{labels.pincode}</Label>
          <Input
            id={`${idPrefix}-pincode`}
            value={draft.pincode}
            inputMode="numeric"
            maxLength={6}
            autoComplete="postal-code"
            aria-invalid={missing.has("pincode") || missing.has("pincodeFormat")}
            onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          {missing.has("pincode") ? <p className="text-xs text-destructive">{labels.errors.pincode}</p> : null}
          {missing.has("pincodeFormat") ? <p className="text-xs text-destructive">{labels.errors.pincodeFormat}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-phone`}>{labels.phone}</Label>
          <Input
            id={`${idPrefix}-phone`}
            type="tel"
            inputMode="tel"
            value={draft.phone}
            maxLength={20}
            autoComplete="tel"
            onChange={(e) => set("phone", e.target.value)}
          />
          {labels.phoneHint ? <p className="text-xs text-sub">{labels.phoneHint}</p> : null}
        </div>
      </div>
    </div>
  );
}
