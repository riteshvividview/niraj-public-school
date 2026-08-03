"use client";

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
 *
 * When `onToggleSelected` is provided and there's no `trailing` control
 * (books/stationery — a plain checkbox toggle, not a size picker like
 * uniform), the whole card is clickable, not just the checkbox itself.
 */
export function ItemCard({ name, meta, price, selected, onToggleSelected, trailing, className }: ItemCardProps) {
  const { language } = useTranslation();
  const wholeCardTogglesSelection = Boolean(onToggleSelected) && !trailing;

  return (
    <div
      role={wholeCardTogglesSelection ? "button" : undefined}
      tabIndex={wholeCardTogglesSelection ? 0 : undefined}
      onClick={wholeCardTogglesSelection ? () => onToggleSelected!(!selected) : undefined}
      onKeyDown={
        wholeCardTogglesSelection
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggleSelected!(!selected);
              }
            }
          : undefined
      }
      className={cn(
        "flex items-center gap-3 rounded-lg border border-line/60 bg-card p-4 transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-md",
        wholeCardTogglesSelection && "cursor-pointer",
        !selected && "opacity-60",
        className,
      )}
    >
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
          onClick={(e) => e.stopPropagation()}
          aria-label={name}
          className="size-5 shrink-0"
        />
      ) : null}
    </div>
  );
}
