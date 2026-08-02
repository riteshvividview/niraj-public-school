"use client";

import { ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PriceSummary } from "@/components/shared/price-summary";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/context";
import { buildPriceSummaryLines, groupItemsByKind } from "@/lib/cart-items";
import { formatCurrencyINR } from "@/lib/format";
import { useCart } from "@/store/cart-store";
import type { CartItem } from "@/types";

function CartLineRow({
  item,
  onRemove,
  changeSizeLabel,
}: {
  item: CartItem;
  onRemove: () => void;
  changeSizeLabel?: string;
}) {
  const { language } = useTranslation();
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{item.label}</p>
        {item.meta ? <p className="truncate text-sm text-sub">{item.meta}</p> : null}
        <div className="mt-1 flex items-center gap-3">
          <span className="text-sm font-semibold text-ink">
            {formatCurrencyINR(item.unitPrice * item.quantity, language)}
          </span>
          {changeSizeLabel ? (
            <Link href="/essentials/uniform" className="text-xs font-medium text-brand hover:underline">
              {changeSizeLabel}
            </Link>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={item.label}
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-sub transition-colors hover:bg-muted hover:text-destructive"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export default function CartPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const cart = useCart();

  const grouped = groupItemsByKind(cart.items);
  const categoryLabels = {
    books: t.essentials.books,
    uniform: t.essentials.uniform,
    stationery: t.essentials.stationery,
    programs: t.nav.programs,
  };
  const lines = buildPriceSummaryLines(cart.items, categoryLabels);

  return (
    <>
      <AppHeader title={t.cart.title} backHref="/essentials" showAvatar />
      <div className="w-full space-y-4 p-4 pb-8 sm:space-y-5 sm:p-6 lg:p-8">
        {cart.count === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title={t.cart.emptyTitle}
            description={t.cart.emptyDescription}
            actionLabel={t.essentials.hubTitle}
            actionHref="/essentials"
          />
        ) : (
          <>
            <div className="space-y-6">
              {grouped.books.length > 0 ? (
                <div>
                  <h2 className="mb-2 font-heading text-base font-semibold text-ink">
                    {categoryLabels.books}
                  </h2>
                  <div className="divide-y divide-line rounded-lg border border-line/60 bg-card">
                    {grouped.books.map((item) => (
                      <CartLineRow key={item.id} item={item} onRemove={() => cart.setIncluded(item, false)} />
                    ))}
                  </div>
                </div>
              ) : null}
              {grouped.uniform.length > 0 ? (
                <div>
                  <h2 className="mb-2 font-heading text-base font-semibold text-ink">
                    {categoryLabels.uniform}
                  </h2>
                  <div className="divide-y divide-line rounded-lg border border-line/60 bg-card">
                    {grouped.uniform.map((item) => (
                      <CartLineRow
                        key={item.id}
                        item={item}
                        onRemove={() => cart.setIncluded(item, false)}
                        changeSizeLabel={t.cart.changeSize}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              {grouped.stationery.length > 0 ? (
                <div>
                  <h2 className="mb-2 font-heading text-base font-semibold text-ink">
                    {categoryLabels.stationery}
                  </h2>
                  <div className="divide-y divide-line rounded-lg border border-line/60 bg-card">
                    {grouped.stationery.map((item) => (
                      <CartLineRow key={item.id} item={item} onRemove={() => cart.setIncluded(item, false)} />
                    ))}
                  </div>
                </div>
              ) : null}
              {grouped.programs.length > 0 ? (
                <div>
                  <h2 className="mb-2 font-heading text-base font-semibold text-ink">
                    {categoryLabels.programs}
                  </h2>
                  <div className="divide-y divide-line rounded-lg border border-line/60 bg-card">
                    {grouped.programs.map((item) => (
                      <CartLineRow key={item.id} item={item} onRemove={() => cart.setIncluded(item, false)} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <h2 className="font-heading text-base font-semibold text-ink">{t.cart.orderSummary}</h2>
              <PriceSummary lines={lines} total={cart.total} note={t.cart.noFeeNote} />
            </div>

            <Button className="w-full" onClick={() => router.push("/checkout/payment")}>
              {t.cart.proceedToPayment}
            </Button>
          </>
        )}
      </div>
    </>
  );
}
