"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ItemCard } from "@/components/shared/item-card";
import { ItemCardSkeleton } from "@/components/shared/loading-skeletons";
import { PencilRuler } from "lucide-react";
import { useTranslation } from "@/i18n/context";
import { stationeryToCartItem } from "@/lib/cart-items";
import { getStationeryItemsByClass } from "@/lib/data-source";
import { formatCurrencyINR } from "@/lib/format";
import { useAuth } from "@/store/auth-store";
import { lineId, useCart } from "@/store/cart-store";
import type { StationeryItem } from "@/types";
import { EssentialsReviewBar } from "../_components/review-bar";

export default function StationeryPage() {
  const { t, language } = useTranslation();
  const { profile } = useAuth();
  const cart = useCart();
  const [items, setItems] = useState<StationeryItem[] | null>(null);

  useEffect(() => {
    if (!profile) return;
    getStationeryItemsByClass(profile.schoolId, profile.classLevelId).then((result) => {
      setItems(result);
      result.forEach((item) => cart.ensureDefault(stationeryToCartItem(item)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  if (!profile) return null;

  const subtotal = (items ?? [])
    .filter((item) => cart.isIncluded(lineId("stationery", item.id)))
    .reduce((sum, item) => sum + item.price, 0);

  return (
    <>
      <AppHeader title={t.essentials.stationery} backHref="/essentials" showAvatar />
      <div className="w-full space-y-4 p-4 pb-28 sm:space-y-5 sm:p-6 lg:p-8">
        <p className="text-sm text-sub">{t.essentials.stationerySubtitle}</p>

        {items === null ? (
          <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <ItemCardSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={PencilRuler} title={t.common.noItemsYet} />
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg border border-line/60 bg-card p-4">
              <span className="text-sm text-sub">{t.common.total}</span>
              <span className="font-heading text-lg font-bold text-ink">
                {formatCurrencyINR(subtotal, language)}
              </span>
            </div>
            <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
              {items.map((item) => {
                const id = lineId("stationery", item.id);
                return (
                  <ItemCard
                    key={item.id}
                    name={item.name}
                    meta={item.quantityLabel}
                    price={item.price}
                    selected={cart.isIncluded(id)}
                    onToggleSelected={(selected) => cart.setIncluded(stationeryToCartItem(item), selected)}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
      <EssentialsReviewBar kind="stationery" />
    </>
  );
}
