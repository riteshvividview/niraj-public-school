"use client";

import { Ruler, Shirt } from "lucide-react";
import { useEffect } from "react";
import useSWR from "swr";
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
import { getClassLevelsBySchool, getMyNewAdmissionStatus, getNewAdmissionItemsFor, getUniformItemsByClass } from "@/lib/data-source";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth-store";
import { lineId, useCart } from "@/store/cart-store";
import { EssentialsReviewBar } from "../_components/review-bar";
import { ExtraItemRequests } from "./_components/extra-item-requests";
import { NewAdmissionSet } from "./_components/new-admission-set";

const UNSELECT_VALUE = "__unselect__";

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
  // Whether this student is a NEW admission is decided on the server (register-number year, the school's
  // academic-year start, any staff override). If that call fails, fall back to the normal list — the
  // payment step enforces the real rule either way.
  const { data: status, error: statusError } = useSWR(profile ? ["na-status", profile.id] : null, () => getMyNewAdmissionStatus());
  const { data: swrItems } = useSWR(profile ? ["uniform:catalogue+na", profile.schoolId, profile.classLevelId, profile.gender] : null, async () => {
    const levels = await getClassLevelsBySchool(profile!.schoolId);
    const classOrder = levels.find((level) => level.id === profile!.classLevelId)?.order ?? 0;
    // The class's regular items, plus the new-admission items that apply to this class and gender.
    const [regular, extra] = await Promise.all([
      getUniformItemsByClass(profile!.schoolId, profile!.classLevelId, profile!.gender),
      getNewAdmissionItemsFor(profile!.schoolId, classOrder, profile!.gender),
    ]);
    return [...regular, ...extra];
  });
  const items = status || statusError ? (swrItems ?? null) : null;
  const mode: "set" | "requests" | "normal" = status?.isNew ? (status.setBought ? "requests" : "set") : "normal";

  useEffect(() => {
    if (!items) return;
    cart.reconcileKind("uniform", items.map((item) => lineId("uniform", item.id)));
    // Only re-reconcile when the catalogue result itself changes, not on every cart update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

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
        ) : mode === "set" ? (
          <NewAdmissionSet items={items} />
        ) : mode === "requests" ? (
          <ExtraItemRequests items={items} userId={profile.id} />
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const id = lineId("uniform", item.id);
              const confirmed = cart.getItem(id);
              const selectedSize = confirmed?.meta ?? "";
              const displayPrice = confirmed?.unitPrice ?? item.sizeOptions[0].price;
              const hasSingleSize = item.sizeOptions.length === 1;

              if (hasSingleSize) {
                const only = item.sizeOptions[0];
                return (
                  <ItemCard
                    key={item.id}
                    name={item.name}
                    meta={item.newAdmission ? t.newAdmission.optional : item.description}
                    price={only.price}
                    selected={Boolean(confirmed)}
                    onToggleSelected={(selected) =>
                      selected ? cart.setIncluded(uniformToCartItem(item, only.size, only.price), true) : cart.remove(id)
                    }
                  />
                );
              }

              return (
                <ItemCard
                  key={item.id}
                  name={item.name}
                  meta={item.newAdmission ? t.newAdmission.optional : item.description}
                  price={displayPrice}
                  selected={Boolean(confirmed)}
                  trailing={
                    <div className="flex flex-col items-end gap-1.5">
                      <Select
                        value={selectedSize}
                        onValueChange={(size) => {
                          if (size === UNSELECT_VALUE) {
                            cart.remove(id);
                            return;
                          }
                          const option = item.sizeOptions.find((o) => o.size === size);
                          if (!option) return;
                          cart.setIncluded(uniformToCartItem(item, size, option.price), true);
                        }}
                      >
                        <SelectTrigger
                          className="w-32"
                          aria-label={`${t.essentials.chooseSizeLabel}: ${item.name}`}
                        >
                          <SelectValue placeholder={t.essentials.sizePlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {confirmed ? (
                            <SelectItem value={UNSELECT_VALUE}>{t.essentials.sizeUnselectOption}</SelectItem>
                          ) : null}
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
