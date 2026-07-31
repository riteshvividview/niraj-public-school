"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ItemCard } from "@/components/shared/item-card";
import { ItemCardSkeleton } from "@/components/shared/loading-skeletons";
import { BookOpen } from "lucide-react";
import { useTranslation } from "@/i18n/context";
import { bookToCartItem } from "@/lib/cart-items";
import { getBooksByClass } from "@/lib/data-source";
import { formatCurrencyINR } from "@/lib/format";
import { useAuth } from "@/store/auth-store";
import { lineId, useCart } from "@/store/cart-store";
import type { Book } from "@/types";
import { EssentialsReviewBar } from "../_components/review-bar";

export default function BooksPage() {
  const { t, language } = useTranslation();
  const { profile } = useAuth();
  const cart = useCart();
  const [books, setBooks] = useState<Book[] | null>(null);

  useEffect(() => {
    if (!profile) return;
    getBooksByClass(profile.schoolId, profile.classLevelId).then((result) => {
      setBooks(result);
      result.forEach((book) => cart.ensureDefault(bookToCartItem(book)));
    });
    // cart is a stable context value keyed by store snapshot identity; only
    // re-run this default-seeding pass when the logged-in profile changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  if (!profile) return null;

  const subtotal = (books ?? [])
    .filter((book) => cart.isIncluded(lineId("book", book.id)))
    .reduce((sum, book) => sum + book.price, 0);

  return (
    <>
      <AppHeader title={t.essentials.books} backHref="/essentials" />
      <div className="space-y-4 p-4 pb-28">
        <p className="text-sm text-sub">{t.essentials.booksSubtitle}</p>

        {books === null ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <ItemCardSkeleton key={i} />
            ))}
          </div>
        ) : books.length === 0 ? (
          <EmptyState icon={BookOpen} title={t.common.noItemsYet} />
        ) : (
          <>
            <div className="flex items-center justify-between rounded-2xl border border-line bg-card p-4">
              <span className="text-sm text-sub">{t.common.total}</span>
              <span className="font-heading text-lg font-bold text-ink">
                {formatCurrencyINR(subtotal, language)}
              </span>
            </div>
            <div className="space-y-3">
              {books.map((book) => {
                const id = lineId("book", book.id);
                return (
                  <ItemCard
                    key={book.id}
                    name={book.title}
                    meta={book.subject}
                    price={book.price}
                    selected={cart.isIncluded(id)}
                    onToggleSelected={(selected) => cart.setIncluded(bookToCartItem(book), selected)}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
      <EssentialsReviewBar />
    </>
  );
}
