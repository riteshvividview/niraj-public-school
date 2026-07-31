"use client";

import { useTranslation } from "@/i18n/context";
import { formatCurrencyINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface PriceSummaryLine {
  label: string;
  amount: number;
}

export interface PriceSummaryProps {
  lines: PriceSummaryLine[];
  total: number;
  note?: string;
  className?: string;
}

/** Cart/checkout breakdown by category, plus a grand total. */
export function PriceSummary({ lines, total, note, className }: PriceSummaryProps) {
  const { language, t } = useTranslation();

  return (
    <div className={cn("rounded-2xl border border-line bg-card p-5", className)}>
      <div className="space-y-2.5">
        {lines.map((line) => (
          <div key={line.label} className="flex items-center justify-between text-sm">
            <span className="text-sub">{line.label}</span>
            <span className="font-medium text-ink">{formatCurrencyINR(line.amount, language)}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <span className="font-heading text-base font-semibold text-ink">{t.common.total}</span>
        <span className="font-heading text-xl font-bold text-ink">{formatCurrencyINR(total, language)}</span>
      </div>
      {note ? <p className="mt-3 text-xs text-sub">{note}</p> : null}
    </div>
  );
}
