"use client";

import { ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PendingPaymentBanner } from "@/components/shared/pending-payment-banner";
import { PriceSummary } from "@/components/shared/price-summary";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/context";
import useSWR from "swr";
import { buildPriceSummaryLines, groupItemsByKind } from "@/lib/cart-items";
import { getMyNewAdmissionStatus } from "@/lib/data-source";
import { useAuth } from "@/store/auth-store";
import { formatCurrencyINR } from "@/lib/format";
import { useCart } from "@/store/cart-store";
import type { CartItem } from "@/types";

function CartLineRow({
  item,
  onRemove,
  changeSizeLabel,
}: {
  item: CartItem;
  /** Omit for a compulsory line (e.g. books) — no product concept of removing a required item. */
  onRemove?: () => void;
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
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={item.label}
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-sub transition-colors hover:bg-muted hover:text-destructive"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

export default function CartPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const cart = useCart();
  const { profile } = useAuth();
  // A new-admission student who hasn't bought their set yet buys the uniform as ONE set (decided by the server).
  const { data: naStatus } = useSWR(profile ? ["na-status", profile.id] : null, () => getMyNewAdmissionStatus());

  const grouped = groupItemsByKind(cart.items);
  const uniformIsASet = Boolean(naStatus?.isNew && !naStatus.setBought);
  const categoryLabels = {
    books: t.essentials.books,
    uniform: t.essentials.uniform,
    programs: t.nav.programs,
  };
  const lines = buildPriceSummaryLines(cart.items, categoryLabels);

  return (
    <>
      <AppHeader title={t.cart.title} backHref="/essentials" showAvatar hideCart />
      <div className="w-full space-y-4 p-4 pb-8 sm:space-y-5 sm:p-6 lg:p-8">
        <PendingPaymentBanner />
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
                      <CartLineRow key={item.id} item={item} />
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
                        // A new student's uniform is one set — it can't be broken up, so removing any piece removes the set.
                        onRemove={() => (uniformIsASet ? grouped.uniform.forEach((line) => cart.remove(line.id)) : cart.setIncluded(item, false))}
                        changeSizeLabel={t.cart.changeSize}
                      />
                    ))}
                  </div>
                  {uniformIsASet ? <p className="mt-1.5 text-xs text-sub">{t.newAdmission.cartSetLocked}</p> : null}
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
