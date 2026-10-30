"use client";

import { CheckCircle2, Lock, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/i18n/context";
import { uniformToCartItem } from "@/lib/cart-items";
import { formatCurrencyINR } from "@/lib/format";
import { lineId, useCart } from "@/store/cart-store";
import type { UniformItem } from "@/types";

/**
 * A NEW-admission student's uniform: the whole set for their class (the class's regular items +
 * the new-admission items) is bought together, once. Every item is required — only the size is
 * chosen. (The payment step enforces the same rule on the server.)
 */
export function NewAdmissionSet({ items, title, description, note }: { items: UniformItem[]; title?: string; description?: string; note?: string }) {
  const { t, language } = useTranslation();
  const cart = useCart();
  const [sizes, setSizes] = useState<Record<string, string>>({});

  const sizeOf = (item: UniformItem) => cart.getItem(lineId("uniform", item.id))?.meta ?? sizes[item.id] ?? item.sizeOptions[0].size;
  const priceOf = (item: UniformItem) => (item.sizeOptions.find((o) => o.size === sizeOf(item)) ?? item.sizeOptions[0]).price;
  const total = items.reduce((sum, item) => sum + priceOf(item), 0);
  const inCart = items.length > 0 && items.every((item) => cart.getItem(lineId("uniform", item.id)));

  function changeSize(item: UniformItem, size: string) {
    setSizes((prev) => ({ ...prev, [item.id]: size }));
    const option = item.sizeOptions.find((o) => o.size === size);
    if (option && cart.getItem(lineId("uniform", item.id))) cart.setIncluded(uniformToCartItem(item, size, option.price), true);
  }

  function addSet() {
    items.forEach((item) => {
      const size = sizeOf(item);
      const option = item.sizeOptions.find((o) => o.size === size) ?? item.sizeOptions[0];
      cart.setIncluded(uniformToCartItem(item, option.size, option.price), true);
    });
  }

  function removeSet() {
    items.forEach((item) => cart.remove(lineId("uniform", item.id)));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-section-essentials/30 bg-section-essentials-bg p-4">
        <p className="font-heading text-base font-semibold text-section-essentials">{title ?? t.newAdmission.setTitle}</p>
        <p className="mt-1 text-sm text-section-essentials">{description ?? t.newAdmission.setDescription}</p>
        <p className="mt-1 text-xs text-section-essentials">{note ?? t.newAdmission.setNote}</p>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-lg border border-line/60 bg-card p-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium break-words text-ink">{item.name}</p>
              <p className="mt-0.5 text-sm font-semibold text-ink">{formatCurrencyINR(priceOf(item), language)}</p>
            </div>
            {item.sizeOptions.length > 1 ? (
              <Select value={sizeOf(item)} onValueChange={(size) => changeSize(item, size)}>
                <SelectTrigger className="w-28" aria-label={`${t.newAdmission.sizeLabel}: ${item.name}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {item.sizeOptions.map((option) => (
                    <SelectItem key={option.size} value={option.size}>
                      {option.size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-sub">
              <Lock className="size-3" />
              {t.newAdmission.required}
            </span>
          </div>
        ))}
      </div>

      <div className="sticky bottom-20 z-10 flex items-center justify-between gap-3 rounded-lg border border-line bg-card p-4 shadow-md lg:bottom-4">
        <div>
          <p className="text-xs text-sub">{t.newAdmission.setTotal}</p>
          <p className="font-heading text-lg font-bold text-ink">{formatCurrencyINR(total, language)}</p>
        </div>
        {inCart ? (
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1 text-sm font-medium text-section-essentials sm:inline-flex">
              <CheckCircle2 className="size-4" />
              {t.newAdmission.setInCart}
            </span>
            <Button variant="outline" onClick={removeSet}>
              {t.newAdmission.removeSet}
            </Button>
          </div>
        ) : (
          <Button onClick={addSet}>
            <ShoppingBag className="size-4" />
            {t.newAdmission.addSet}
          </Button>
        )}
      </div>
    </div>
  );
}
