"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatTemplate } from "@/i18n/format";
import { useTranslation } from "@/i18n/context";
import { formatCurrencyINR } from "@/lib/format";
import { useCart } from "@/store/cart-store";

/**
 * Sticky across all three essentials sub-sections, reflecting the whole
 * cart (not just the current page's category). Sits just above the app's
 * BottomNav (`bottom-16` ≈ the nav's height) rather than stacking sticky
 * elements at the same edge.
 */
export function EssentialsReviewBar() {
  const { t, language } = useTranslation();
  const { count, total } = useCart();

  if (count === 0) return null;

  return (
    <div className="sticky bottom-16 z-30 mx-4 mb-3 rounded-2xl border border-line bg-card/95 p-4 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-sub">{formatTemplate(t.essentials.itemsCount, { n: count })}</p>
          <p className="font-heading text-lg font-bold text-ink">{formatCurrencyINR(total, language)}</p>
        </div>
        <Button asChild>
          <Link href="/cart">{t.essentials.reviewAndPay}</Link>
        </Button>
      </div>
    </div>
  );
}
