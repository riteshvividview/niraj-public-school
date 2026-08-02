"use client";

import { BookOpen, ChevronRight, PencilRuler, Shirt } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/shared/app-header";
import { formatTemplate } from "@/i18n/format";
import { useTranslation } from "@/i18n/context";
import { bookToCartItem, stationeryToCartItem } from "@/lib/cart-items";
import { getBooksByClass, getStationeryItemsByClass, getUniformItemsByClass } from "@/lib/data-source";
import { useAuth } from "@/store/auth-store";
import { lineId, useCart } from "@/store/cart-store";
import type { Book, StationeryItem, UniformItem } from "@/types";

interface HubRowProps {
  href: string;
  icon: typeof BookOpen;
  title: string;
  statusLabel: string;
  isComplete: boolean;
}

function HubRow({ href, icon: Icon, title, statusLabel, isComplete }: HubRowProps) {
  return (
    <Link
      href={href}
      className="mb-2.5 flex items-center gap-3 rounded-lg border border-line/60 bg-card p-4 transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-md last:mb-0"
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-section-essentials-bg text-section-essentials sm:size-12">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">{title}</p>
        <p className={isComplete ? "text-sm text-section-essentials" : "text-sm text-sub"}>{statusLabel}</p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-sub" />
    </Link>
  );
}

export default function EssentialsHubPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const cart = useCart();

  const [books, setBooks] = useState<Book[] | null>(null);
  const [uniformItems, setUniformItems] = useState<UniformItem[] | null>(null);
  const [stationeryItems, setStationeryItems] = useState<StationeryItem[] | null>(null);

  useEffect(() => {
    if (!profile) return;
    getBooksByClass(profile.schoolId, profile.classLevelId).then((result) => {
      setBooks(result);
      result.forEach((book) => cart.ensureDefault(bookToCartItem(book)));
    });
    getUniformItemsByClass(profile.schoolId, profile.classLevelId).then(setUniformItems);
    getStationeryItemsByClass(profile.schoolId, profile.classLevelId).then((result) => {
      setStationeryItems(result);
      result.forEach((item) => cart.ensureDefault(stationeryToCartItem(item)));
    });
    // Only re-seed when the logged-in profile changes, not on every cart update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  if (!profile) return null;

  const booksSelected = books?.filter((book) => cart.isIncluded(lineId("book", book.id))).length ?? 0;
  const uniformConfirmed =
    uniformItems?.filter((item) => cart.isIncluded(lineId("uniform", item.id))).length ?? 0;
  const stationerySelected =
    stationeryItems?.filter((item) => cart.isIncluded(lineId("stationery", item.id))).length ?? 0;

  return (
    <>
      <AppHeader title={t.essentials.hubTitle} showAvatar />
      <div className="w-full space-y-4 p-4 pb-8 sm:space-y-5 sm:p-6 lg:p-8">
        <p className="text-sm text-sub">{t.essentials.hubSubtitle}</p>

        <div>
          <HubRow
            href="/essentials/books"
            icon={BookOpen}
            title={t.essentials.books}
            statusLabel={
              books === null
                ? "…"
                : formatTemplate(t.essentials.selectedCount, { selected: booksSelected, total: books.length })
            }
            isComplete={books !== null && booksSelected === books.length && books.length > 0}
          />
          <HubRow
            href="/essentials/uniform"
            icon={Shirt}
            title={t.essentials.uniform}
            statusLabel={
              uniformItems === null
                ? "…"
                : formatTemplate(t.essentials.confirmedCount, {
                    selected: uniformConfirmed,
                    total: uniformItems.length,
                  })
            }
            isComplete={
              uniformItems !== null && uniformConfirmed === uniformItems.length && uniformItems.length > 0
            }
          />
          <HubRow
            href="/essentials/stationery"
            icon={PencilRuler}
            title={t.essentials.stationery}
            statusLabel={
              stationeryItems === null
                ? "…"
                : formatTemplate(t.essentials.selectedCount, {
                    selected: stationerySelected,
                    total: stationeryItems.length,
                  })
            }
            isComplete={
              stationeryItems !== null &&
              stationerySelected === stationeryItems.length &&
              stationeryItems.length > 0
            }
          />
        </div>
      </div>
    </>
  );
}
