"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatTemplate } from "@/i18n/format";
import { useTranslation } from "@/i18n/context";
import { subtotal } from "@/lib/cart-items";
import { formatCurrencyINR } from "@/lib/format";
import { useCart } from "@/store/cart-store";
import type { CartItem } from "@/types";

/**
 * Sticky across all three essentials sub-sections, scoped to just the
 * current page's category (`kind`) — not the whole cart, so switching
 * between Books/Uniform/Stationery doesn't leak another category's total
 * onto this page. Sits just above the app's BottomNav on mobile
 * (`bottom-16` ≈ the nav's height) rather than stacking sticky elements at
 * the same edge; on md+ there's no bottom nav (it's a sidebar instead), so
 * it sits close to the viewport edge like a normal sticky bar.
 */
export function EssentialsReviewBar({ kind }: { kind: CartItem["kind"] }) {
  const { t, language } = useTranslation();
  const { items } = useCart();

  const scoped = items.filter((item) => item.kind === kind);
  const count = scoped.length;
  const total = subtotal(scoped);

  if (count === 0) return null;

  return (
    <div className="sticky bottom-16 z-30 mx-4 mb-3 rounded-xl border border-line/60 bg-card/95 p-4 shadow-lg backdrop-blur md:bottom-4">
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
