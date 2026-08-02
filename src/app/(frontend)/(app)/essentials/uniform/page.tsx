"use client";

import { Ruler, Shirt } from "lucide-react";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ItemCard } from "@/components/shared/item-card";
import { ItemCardSkeleton } from "@/components/shared/loading-skeletons";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useTranslation } from "@/i18n/context";
import { uniformToCartItem } from "@/lib/cart-items";
import { getUniformItemsByClass } from "@/lib/data-source";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth-store";
import { lineId, useCart } from "@/store/cart-store";
import type { UniformItem } from "@/types";
import { EssentialsReviewBar } from "../_components/review-bar";

const SIZE_GUIDE_ROWS = [
  { size: "18", age: "3–4 yrs", height: "95–105" },
  { size: "20", age: "4–5 yrs", height: "105–110" },
  { size: "22", age: "5–6 yrs", height: "110–115" },
  { size: "24", age: "6–7 yrs", height: "115–120" },
  { size: "26", age: "7–8 yrs", height: "120–125" },
  { size: "28", age: "8–9 yrs", height: "125–130" },
  { size: "30", age: "9–10 yrs", height: "130–140" },
  { size: "32", age: "10–11 yrs", height: "140–145" },
  { size: "34", age: "11–12 yrs", height: "145–150" },
  { size: "36", age: "12–13 yrs", height: "150–155" },
  { size: "38", age: "13–14 yrs", height: "155–160" },
];

function SizeGuide({ triggerLabel, title, ageLabel, heightLabel }: {
  triggerLabel: string;
  title: string;
  ageLabel: string;
  heightLabel: string;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Ruler className="size-4" />
          {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80vh]">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-4 pb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-sub">
                <th className="py-2 font-medium">Size</th>
                <th className="py-2 font-medium">{ageLabel}</th>
                <th className="py-2 font-medium">{heightLabel}</th>
              </tr>
            </thead>
            <tbody>
              {SIZE_GUIDE_ROWS.map((row) => (
                <tr key={row.size} className="border-b border-line last:border-b-0">
                  <td className="py-2 font-medium text-ink">{row.size}</td>
                  <td className="py-2 text-sub">{row.age}</td>
                  <td className="py-2 text-sub">{row.height}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function UniformPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const cart = useCart();
  const [items, setItems] = useState<UniformItem[] | null>(null);

  useEffect(() => {
    if (!profile) return;
    getUniformItemsByClass(profile.schoolId, profile.classLevelId).then(setItems);
  }, [profile]);

  if (!profile) return null;

  return (
    <>
      <AppHeader
        title={t.essentials.uniform}
        backHref="/essentials"
        showAvatar
        right={
          <SizeGuide
            triggerLabel={t.essentials.sizeGuideCta}
            title={t.essentials.sizeGuideTitle}
            ageLabel={t.essentials.sizeGuideAgeColumn}
            heightLabel={t.essentials.sizeGuideHeightColumn}
          />
        }
      />
      <div className="w-full space-y-4 p-4 pb-28 sm:space-y-5 sm:p-6 lg:p-8">
        {items === null ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <ItemCardSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={Shirt} title={t.common.noItemsYet} />
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const id = lineId("uniform", item.id);
              const confirmed = cart.getItem(id);
              const selectedSize = confirmed?.meta ?? "";
              const displayPrice = confirmed?.unitPrice ?? item.sizeOptions[0].price;

              return (
                <ItemCard
                  key={item.id}
                  name={item.name}
                  meta={item.description}
                  price={displayPrice}
                  imageUrl={item.imageUrl}
                  selected={Boolean(confirmed)}
                  trailing={
                    <div className="flex flex-col items-end gap-1.5">
                      <Select
                        value={selectedSize}
                        onValueChange={(size) => {
                          const option = item.sizeOptions.find((o) => o.size === size);
                          if (!option) return;
                          cart.setIncluded(uniformToCartItem(item, size, option.price), true);
                        }}
                      >
                        <SelectTrigger
                          className="w-24"
                          aria-label={`${t.essentials.chooseSizeLabel}: ${item.name}`}
                        >
                          <SelectValue placeholder={t.essentials.sizePlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {item.sizeOptions.map((option) => (
                            <SelectItem key={option.size} value={option.size}>
                              {option.size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span
                        className={cn(
                          "text-xs whitespace-nowrap",
                          confirmed ? "text-section-essentials" : "text-sub",
                        )}
                      >
                        {confirmed ? t.essentials.sizeConfirmed : t.essentials.sizeNotConfirmed}
                      </span>
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </div>
      <EssentialsReviewBar kind="uniform" />
    </>
  );
}
