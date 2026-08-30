"use client";

import { BookOpen, ChevronRight, Shirt } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import useSWR from "swr";
import { AppHeader } from "@/components/shared/app-header";
import { formatTemplate } from "@/i18n/format";
import { useTranslation } from "@/i18n/context";
import { getBooksByClass, getUniformItemsByClass } from "@/lib/data-source";
import { useAuth } from "@/store/auth-store";
import { lineId, useCart } from "@/store/cart-store";

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

  // Only for the "X of Y selected" status label below — the actual
  // selection/confirmation (and cart seeding) happens on the books page's
  // own selection step, since which book set applies depends on choices
  // made there, not just the student's saved profile defaults.
  const { data: books } = useSWR(
    profile ? ["essentials-hub:books", profile.schoolId, profile.classLevelId, profile.academicLanguage, profile.stream, profile.elective] : null,
    () =>
      getBooksByClass(profile!.schoolId, profile!.classLevelId, {
        language: profile!.academicLanguage,
        stream: profile!.stream,
        elective: profile!.elective,
      }),
  );
  const { data: uniformItems } = useSWR(
    profile ? ["essentials-hub:uniform", profile.schoolId, profile.classLevelId, profile.gender] : null,
    () => getUniformItemsByClass(profile!.schoolId, profile!.classLevelId, profile!.gender),
  );

  // Reconciling the cart is a side effect of the uniform catalogue loading,
  // not part of the fetch itself — runs whenever a fresh result comes in.
  useEffect(() => {
    if (!uniformItems) return;
    cart.reconcileKind("uniform", uniformItems.map((item) => lineId("uniform", item.id)));
    // Only re-reconcile when the catalogue result itself changes, not on every cart update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniformItems]);

  if (!profile) return null;

  const booksSelected = books?.filter((book) => cart.isIncluded(lineId("book", book.id))).length ?? 0;
  const uniformConfirmed =
    uniformItems?.filter((item) => cart.isIncluded(lineId("uniform", item.id))).length ?? 0;

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
              books === undefined
                ? "…"
                : formatTemplate(t.essentials.selectedCount, { selected: booksSelected, total: books.length })
            }
            isComplete={books !== undefined && booksSelected === books.length && books.length > 0}
          />
          <HubRow
            href="/essentials/uniform"
            icon={Shirt}
            title={t.essentials.uniform}
            statusLabel={
              uniformItems === undefined
                ? "…"
                : formatTemplate(t.essentials.confirmedCount, {
                    selected: uniformConfirmed,
                    total: uniformItems.length,
                  })
            }
            isComplete={
              uniformItems !== undefined && uniformConfirmed === uniformItems.length && uniformItems.length > 0
            }
          />
        </div>
      </div>
    </>
  );
}
