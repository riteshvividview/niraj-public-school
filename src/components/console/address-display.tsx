"use client";

import { Copy, MapPin, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addressLines, formatAddress, mapsLink } from "@/lib/address";
import { telLink, whatsAppLink } from "@/lib/contact-links";
import { cn } from "@/lib/utils";
import type { Address } from "@/types";

/** One truncated line for lists and cards. Renders nothing when the student has no address. */
export function AddressInline({ address, className }: { address?: Address; className?: string }) {
  if (!address) return null;
  return (
    <p className={cn("flex items-start gap-1.5 text-xs text-sub", className)} title={formatAddress(address)}>
      <MapPin className="mt-0.5 size-3 shrink-0" />
      <span className="line-clamp-2">{formatAddress(address)}</span>
    </p>
  );
}

/**
 * Full delivery address for detail views: the lines, the delivery phone with
 * call / WhatsApp, a Maps link (exact pin when it came from live location) and
 * a copy button for pasting into a courier app. Says so plainly when the
 * student hasn't added one — an address is optional.
 */
export function AddressBlock({ address, fallbackPhone }: { address?: Address; fallbackPhone?: string }) {
  if (!address) return <p className="text-sm text-sub">No delivery address on file.</p>;
  const phone = address.phone ?? fallbackPhone;
  return (
    <div className="space-y-2">
      <div className="space-y-0.5 text-sm text-ink">
        {addressLines(address).map((line) => (
          <p key={line}>{line}</p>
        ))}
        {address.source === "live-location" ? <p className="text-xs text-sub">Added from live location</p> : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {phone ? (
          <>
            <Button asChild size="sm" variant="outline" className="h-7 gap-1.5 px-2">
              <a href={telLink(phone)}>
                <Phone className="size-3.5" />
                {phone}
              </a>
            </Button>
            <Button asChild size="sm" variant="outline" className="h-7 gap-1.5 px-2">
              <a href={whatsAppLink(phone)} target="_blank" rel="noreferrer">
                <MessageCircle className="size-3.5" />
                WhatsApp
              </a>
            </Button>
          </>
        ) : null}
        <Button asChild size="sm" variant="outline" className="h-7 gap-1.5 px-2">
          <a href={mapsLink(address)} target="_blank" rel="noreferrer">
            <MapPin className="size-3.5" />
            Maps
          </a>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 px-2"
          onClick={() => {
            const text = [formatAddress(address), phone].filter(Boolean).join("\nPhone: ");
            navigator.clipboard
              .writeText(text)
              .then(() => toast.success("Address copied"))
              .catch(() => toast.error("Couldn't copy — select the text instead."));
          }}
        >
          <Copy className="size-3.5" />
          Copy
        </Button>
      </div>
    </div>
  );
}
