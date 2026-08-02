"use client";

import { BookOpen, CalendarDays, PencilRuler, Receipt as ReceiptIcon, Shirt } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ProgramCardSkeleton } from "@/components/shared/loading-skeletons";
import { ProgramCard } from "@/components/shared/program-card";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/context";
import { getClassLevelById, getPrograms, getSchoolById } from "@/lib/data-source";
import { useAuth } from "@/store/auth-store";
import { useReceipts } from "@/store/receipts-store";
import type { ClassLevel, Program, School } from "@/types";

const UPCOMING_PROGRAMS_LIMIT = 2;

export default function HomePage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const receipts = useReceipts();

  const [school, setSchool] = useState<School | null>(null);
  const [classLevel, setClassLevel] = useState<ClassLevel | null>(null);
  const [programs, setPrograms] = useState<Program[] | null>(null);

  useEffect(() => {
    if (!profile) return;
    getSchoolById(profile.schoolId).then(setSchool);
    getClassLevelById(profile.classLevelId).then(setClassLevel);
    getPrograms({ schoolId: profile.schoolId }).then((result) =>
      setPrograms(result.slice(0, UPCOMING_PROGRAMS_LIMIT)),
    );
  }, [profile]);

  if (!profile) return null;

  const hasReceipts = receipts.getForUser(profile.id).length > 0;

  return (
    <>
      <AppHeader
        title={t.appName}
        showAvatar
        right={
          <Button variant="outline" size="sm" className="gap-1.5 px-2.5 sm:px-3" asChild>
            <Link href="/timetable" aria-label={t.home.viewTimetable}>
              <CalendarDays className="size-4" />
              <span className="hidden sm:inline">{t.home.viewTimetable}</span>
            </Link>
          </Button>
        }
      />

      <div className="w-full space-y-6 p-4 pb-8 sm:space-y-8 sm:p-6 lg:p-8">
        <section className="animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-line/60 bg-card p-5 duration-500 sm:p-6">
          <p className="text-sm text-sub">{t.welcome},</p>
          <p className="font-heading text-xl font-semibold text-ink sm:text-2xl">{profile.name}</p>
          {school ? (
            <p className="mt-2 text-sm text-sub">
              {school.name}
              {classLevel ? ` · ${classLevel.label}` : ""}
            </p>
          ) : null}
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-base font-semibold text-ink">{t.nav.essentials}</h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Link href="/essentials/books">
              <SectionCard icon={BookOpen} title={t.essentials.books} accent="essentials" />
            </Link>
            <Link href="/essentials/uniform">
              <SectionCard icon={Shirt} title={t.essentials.uniform} accent="essentials" />
            </Link>
            <Link href="/essentials/stationery">
              <SectionCard icon={PencilRuler} title={t.essentials.stationery} accent="essentials" />
            </Link>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-ink">
              {t.home.upcomingProgramsTitle}
            </h2>
            <Link href="/programs" className="text-sm font-medium text-brand hover:underline">
              {t.home.viewAll}
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {programs === null
              ? Array.from({ length: UPCOMING_PROGRAMS_LIMIT }).map((_, i) => (
                  <ProgramCardSkeleton key={i} />
                ))
              : programs.map((program) => (
                  <ProgramCard
                    key={program.id}
                    title={program.title}
                    date={program.date}
                    venue={program.venue}
                    fee={program.fee}
                    seatsAvailable={program.seatsAvailable}
                    status={program.status}
                    href={`/programs/${program.id}`}
                  />
                ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-base font-semibold text-ink">{t.nav.receipts}</h2>
          {hasReceipts ? (
            <Link
              href="/receipts"
              className="flex items-center gap-3 rounded-lg border border-line/60 bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-section-workspace-bg text-brand">
                <ReceiptIcon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">{t.home.hasReceiptsMessage}</p>
              </div>
              <span className="text-sm font-medium text-brand">{t.home.viewAll}</span>
            </Link>
          ) : (
            <EmptyState
              icon={ReceiptIcon}
              title={t.home.noReceiptsTitle}
              description={t.home.noReceiptsDescription}
            />
          )}
        </section>
      </div>
    </>
  );
}
