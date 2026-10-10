"use client";

import { CheckCircle2, Loader2, MapPin, Navigation } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AddressFields, type AddressFieldLabels } from "@/components/shared/address-fields";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/i18n/context";
import { draftFromAddress, formatAddress, missingAddressFields, PINCODE_PATTERN } from "@/lib/address";
import { removeMyAddress, saveMyAddress, suggestAddressFromLocation, type AddressSuggestion } from "@/lib/data-source";
import { useAuth } from "@/store/auth-store";
import type { AddressDraft } from "@/types";

function useAddressLabels(): AddressFieldLabels {
  const { t } = useTranslation();
  const p = t.addressSection;
  return {
    house: p.houseLabel,
    housePlaceholder: p.housePlaceholder,
    street: p.streetLabel,
    streetPlaceholder: p.streetPlaceholder,
    landmark: p.landmarkLabel,
    landmarkPlaceholder: p.landmarkPlaceholder,
    city: p.cityLabel,
    state: p.stateLabel,
    pincode: p.pincodeLabel,
    phone: p.phoneLabel,
    phoneHint: p.phoneHint || undefined,
    errors: {
      house: p.errHouse,
      street: p.errStreet,
      city: p.errCity,
      state: p.errState,
      pincode: p.errPincode,
      pincodeFormat: p.errPincodeFormat,
    },
  };
}

/**
 * One plain row in the Profile list, styled exactly like "Register number" /
 * "Class" / "Language" — deliberately nothing special, so it isn't read as an
 * offer of delivery. Shows the saved address (or "Not added") and an Add / Edit link.
 */
export function AddressRow() {
  const { t } = useTranslation();
  const p = t.addressSection;
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);

  if (!profile) return null;
  const address = profile.address;

  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-3.5 sm:py-4">
      <span className="shrink-0 text-sm text-sub">{p.title}</span>
      <div className="flex min-w-0 flex-col items-end gap-1 text-right">
        <span className={address ? "text-sm font-medium text-ink" : "text-sm text-sub"}>
          {address ? formatAddress(address) : p.empty}
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="cursor-pointer text-sm font-medium text-brand hover:underline"
        >
          {address ? p.edit : p.add}
        </button>
      </div>
      <AddressDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

interface PendingSuggestion {
  latitude: number;
  longitude: number;
  suggestion: AddressSuggestion;
}

function AddressDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        {open ? <DialogBody onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function DialogBody({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const p = t.addressSection;
  const { profile, login } = useAuth();
  const labels = useAddressLabels();

  const [draft, setDraft] = useState<AddressDraft>(() => draftFromAddress(profile?.address, profile?.mobileNumber));
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingSuggestion | null>(null);
  const [appliedFromLocation, setAppliedFromLocation] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  function startLiveLocation() {
    setLocationError(null);
    setPending(null);
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setLocationError(p.locationUnsupported);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const suggestion = await suggestAddressFromLocation(latitude, longitude);
          setPending({ latitude, longitude, suggestion });
        } catch (error) {
          const reason = (error as { reason?: string }).reason;
          setLocationError(reason === "not-found" ? p.lookupNotFound : p.lookupFailed);
          // We still have the exact spot — keep it with the address they type.
          setDraft((d) => ({ ...d, latitude, longitude, source: "live-location" }));
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        setLocating(false);
        setLocationError(error.code === 1 ? p.locationDenied : error.code === 3 ? p.locationTimeout : p.lookupFailed);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  function confirmSuggestion() {
    if (!pending) return;
    const s = pending.suggestion;
    setDraft((d) => ({
      ...d,
      house: s.house?.trim() || d.house,
      street: s.street?.trim() || d.street,
      city: s.city?.trim() || d.city,
      state: s.state?.trim() || d.state,
      pincode: s.pincode && PINCODE_PATTERN.test(s.pincode) ? s.pincode : d.pincode,
      latitude: pending.latitude,
      longitude: pending.longitude,
      source: "live-location",
    }));
    setAppliedFromLocation(true);
    setPending(null);
  }

  async function save() {
    if (missingAddressFields(draft).length > 0) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    try {
      const saved = await saveMyAddress(draft);
      if (profile) login({ ...profile, address: saved });
      toast.success(p.savedToast);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : p.saveFailed);
      setSaving(false);
    }
  }

  async function confirmRemove() {
    setRemoving(false);
    setSaving(true);
    try {
      await removeMyAddress();
      if (profile) login({ ...profile, address: undefined });
      toast.success(p.removedToast);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : p.saveFailed);
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{p.dialogTitle}</DialogTitle>
        <DialogDescription>{p.dialogDescription}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Button type="button" variant="outline" className="w-full gap-2" disabled={locating || saving} onClick={startLiveLocation}>
            {locating ? <Loader2 className="size-4 animate-spin" /> : <Navigation className="size-4" />}
            {locating ? p.locating : p.useLiveLocation}
          </Button>
          <p className="text-xs text-sub">{p.osmNote}</p>
          {locationError ? <p className="text-sm text-destructive">{locationError}</p> : null}
        </div>

        {pending ? (
          <div className="space-y-3 rounded-lg border border-brand/40 bg-section-workspace-bg p-3.5">
            <div>
              <p className="text-sm font-semibold text-ink">{p.confirmTitle}</p>
              <p className="mt-1 text-sm text-ink">
                {pending.suggestion.displayName ??
                  [pending.suggestion.street, pending.suggestion.city, pending.suggestion.state, pending.suggestion.pincode]
                    .filter(Boolean)
                    .join(", ")}
              </p>
              <p className="mt-1 text-xs text-sub">{p.confirmQuestion}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={confirmSuggestion}>
                {p.confirmYes}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setPending(null)}>
                {p.confirmNo}
              </Button>
            </div>
          </div>
        ) : null}

        {appliedFromLocation ? (
          <p className="flex items-start gap-2 text-sm text-ink">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-section-essentials" />
            {p.confirmedHint}
          </p>
        ) : null}

        <AddressFields draft={draft} onChange={setDraft} labels={labels} idPrefix="profile-address" showErrors={showErrors} />

        {draft.latitude !== undefined ? (
          <p className="flex items-center gap-1.5 text-xs text-sub">
            <MapPin className="size-3.5" />
            {p.locationCaptured}
          </p>
        ) : null}
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        {profile?.address ? (
          <Button type="button" variant="ghost" className="text-destructive sm:mr-auto" disabled={saving} onClick={() => setRemoving(true)}>
            {p.remove}
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          {p.cancel}
        </Button>
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {saving ? p.saving : p.save}
        </Button>
      </DialogFooter>

      <ConfirmDeleteDialog
        open={removing}
        onOpenChange={setRemoving}
        title={p.removeConfirmTitle}
        description={p.removeConfirmDescription}
        confirmLabel={p.remove}
        cancelLabel={p.cancel}
        onConfirm={confirmRemove}
      />
    </>
  );
}
