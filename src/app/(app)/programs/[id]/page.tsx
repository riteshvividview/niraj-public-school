"use client";

import { Calendar, MapPin, Phone, Users } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/shared/app-header";
import { StatusBadge, toBadgeStatus } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/i18n/context";
import { getProgramById, getSchoolById } from "@/lib/data-source";
import { formatCurrencyINR, formatDate } from "@/lib/format";
import { kebabToCamel } from "@/lib/utils";
import { lineId, useCart } from "@/store/cart-store";
import type { CartItem, Program, School } from "@/types";

export default function ProgramDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t, language } = useTranslation();
  const cart = useCart();

  const [program, setProgram] = useState<Program | null | undefined>(undefined);
  const [school, setSchool] = useState<School | null>(null);

  useEffect(() => {
    getProgramById(params.id).then(setProgram);
  }, [params.id]);

  useEffect(() => {
    if (!program) return;
    getSchoolById(program.schoolId).then(setSchool);
  }, [program]);

  useEffect(() => {
    if (program === null) {
      router.replace("/programs");
    }
  }, [program, router]);

  if (program === undefined || program === null) {
    return (
      <>
        <AppHeader title={t.nav.programs} backHref="/programs" />
        <div className="space-y-4 p-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </>
    );
  }

  const id = lineId("program", program.id);
  const inCart = cart.isIncluded(id);
  const isFull = program.status === "full";

  function handleEnroll() {
    const cartItem: CartItem = {
      id,
      kind: "program",
      refId: program!.id,
      label: program!.title,
      meta: formatDate(program!.date, language),
      unitPrice: program!.fee,
      quantity: 1,
    };
    cart.setIncluded(cartItem, true);
    router.push("/cart");
  }

  const categoryLabel =
    t.programsPage.categories[
      kebabToCamel(program.category) as keyof typeof t.programsPage.categories
    ];

  return (
    <>
      <AppHeader title={program.title} backHref="/programs" />
      <div className="space-y-5 p-4 pb-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-sub">{school?.name ?? ""}</p>
            <h1 className="font-heading text-xl font-bold text-ink">{program.title}</h1>
            <p className="mt-1 text-xs font-medium text-brand">{categoryLabel}</p>
          </div>
          <StatusBadge status={toBadgeStatus(program.status)} />
        </div>

        <p className="text-sm text-ink">{program.description}</p>

        <div className="space-y-3 rounded-2xl border border-line bg-card p-4">
          <div className="flex items-center gap-3">
            <Calendar className="size-4 shrink-0 text-sub" />
            <div>
              <p className="text-xs text-sub">{t.programsPage.dateLabel}</p>
              <p className="text-sm font-medium text-ink">{formatDate(program.date, language)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="size-4 shrink-0 text-sub" />
            <div>
              <p className="text-xs text-sub">{t.programsPage.venueLabel}</p>
              <p className="text-sm font-medium text-ink">{program.venue}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Users className="size-4 shrink-0 text-sub" />
            <div>
              <p className="text-xs text-sub">{t.programsPage.seatsLabel}</p>
              <p className="text-sm font-medium text-ink">
                {program.seatsAvailable} / {program.seatsTotal}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs text-sub">{t.programsPage.organizedBy}</p>
          <p className="text-sm font-medium text-ink">{school?.name ?? ""}</p>
          <div className="mt-2 flex items-center gap-2 text-sm text-sub">
            <Phone className="size-4" />
            {program.contactPhone}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-line bg-card p-4">
          <span className="text-sm text-sub">{t.programsPage.feeLabel}</span>
          <span className="font-heading text-xl font-bold text-ink">
            {formatCurrencyINR(program.fee, language)}
          </span>
        </div>

        {isFull ? (
          <div className="rounded-2xl border border-section-pay bg-section-pay-bg p-4 text-center">
            <p className="font-medium text-section-pay">{t.programsPage.fullTitle}</p>
            <p className="mt-1 text-sm text-section-pay">{t.programsPage.fullDescription}</p>
          </div>
        ) : inCart ? (
          <div className="space-y-2 rounded-2xl border border-line bg-card p-4 text-center">
            <p className="text-sm text-ink">{t.programsPage.alreadyInCart}</p>
            <Button className="w-full" variant="outline" onClick={() => router.push("/cart")}>
              {t.programsPage.viewCart}
            </Button>
          </div>
        ) : (
          <Button className="w-full" onClick={handleEnroll}>
            {t.programsPage.enrollAndPay}
          </Button>
        )}
      </div>
    </>
  );
}
