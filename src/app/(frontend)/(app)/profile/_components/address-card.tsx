"use client";

import { CheckCircle2, Loader2, MapPin, Navigation } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AddressFields, type AddressFieldLabels } from "@/components/shared/address-fields";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/i18n/context";
import { addressLines, draftFromAddress, mapsLink, missingAddressFields, PINCODE_PATTERN } from "@/lib/address";
import { removeMyAddress, saveMyAddress, suggestAddressFromLocation, type AddressSuggestion } from "@/lib/data-source";
import { formatDate } from "@/lib/format";
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
    phoneHint: p.phoneHint,
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

/** Profile → "Delivery address": shows the saved address and opens the add/edit dialog. */
export function AddressCard() {
  const { t, language } = useTranslation();
  const p = t.addressSection;
  const { profile, login } = useAuth();
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  if (!profile) return null;
  const address = profile.address;

  async function confirmRemove() {
    setRemoving(false);
    try {
      await removeMyAddress();
      login({ ...profile!, address: undefined });
      toast.success(p.removedToast);
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : p.saveFailed);
    }
  }

  return (
    <section className="rounded-lg border border-line/60 bg-card p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-section-workspace-bg text-brand">
          <MapPin className="size-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-base font-semibold text-ink">{p.title}</h2>
          {address ? (
            <div className="mt-1.5 space-y-0.5 text-sm text-ink">
              {addressLines(address).map((line) => (
                <p key={line}>{line}</p>
              ))}
              {address.phone ? <p className="text-sub">{address.phone}</p> : null}
              <p className="pt-1 text-xs text-sub">
                {address.source === "live-location" ? p.sourceLive : p.sourceManual}
                {address.updatedAt ? ` · ${p.updatedOn} ${formatDate(address.updatedAt, language)}` : ""}
              </p>
            </div>
          ) : (
            <>
              <p className="mt-1 text-sm font-medium text-ink">{p.empty}</p>
              <p className="mt-0.5 text-sm text-sub">{p.optionalNote}</p>
            </>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant={address ? "outline" : "default"} onClick={() => setOpen(true)}>
              {address ? p.edit : p.add}
            </Button>
            {address ? (
              <>
                <Button asChild size="sm" variant="outline">
                  <a href={mapsLink(address)} target="_blank" rel="noreferrer">
                    {p.openInMaps}
                  </a>
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setRemoving(true)}>
                  {p.remove}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <AddressDialog open={open} onOpenChange={setOpen} />

      <ConfirmDeleteDialog
        open={removing}
        onOpenChange={setRemoving}
        title={p.removeConfirmTitle}
        description={p.removeConfirmDescription}
        confirmLabel={p.remove}
        cancelLabel={p.cancel}
        onConfirm={confirmRemove}
      />
    </section>
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
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          {p.cancel}
        </Button>
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {saving ? p.saving : p.save}
        </Button>
      </DialogFooter>
    </>
  );
}
