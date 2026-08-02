"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "@/i18n/context";
import { formatCurrencyINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ItemCardProps {
  name: string;
  /** Subject, size range, quantity label, etc. */
  meta?: string;
  price: number;
  imageUrl?: string | null;
  /** Whether this item is currently included in the essentials selection. */
  selected: boolean;
  onToggleSelected?: (selected: boolean) => void;
  /** Extra controls slot — e.g. Phase 5's uniform size picker. */
  trailing?: ReactNode;
  className?: string;
}

/**
 * Catalogue item summary used for books/uniform/stationery. Fixed-list
 * items default to selected; unchecking marks "not needed" rather than
 * removing the row, per plan.html's "fixed list, not à la carte" model.
 */
export function ItemCard({
  name,
  meta,
  price,
  imageUrl,
  selected,
  onToggleSelected,
  trailing,
  className,
}: ItemCardProps) {
  const { language } = useTranslation();

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-line/60 bg-card p-4 transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-md",
        !selected && "opacity-60",
        className,
      )}
    >
      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
        {imageUrl ? (
          <Image src={imageUrl} alt={name} width={56} height={56} className="size-full object-cover" />
        ) : (
          <span className="text-xs font-semibold text-sub">{name.slice(0, 2).toUpperCase()}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{name}</p>
        {meta ? <p className="truncate text-sm text-sub">{meta}</p> : null}
        <p className="mt-0.5 text-sm font-semibold text-ink">{formatCurrencyINR(price, language)}</p>
      </div>
      {trailing}
      {onToggleSelected ? (
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onToggleSelected(checked === true)}
          aria-label={name}
          className="size-5 shrink-0"
        />
      ) : null}
    </div>
  );
}
