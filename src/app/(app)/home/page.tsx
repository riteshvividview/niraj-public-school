"use client";

import { BookOpen, PencilRuler, Receipt as ReceiptIcon, Shirt, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ProgramCardSkeleton } from "@/components/shared/loading-skeletons";
import { ProgramCard } from "@/components/shared/program-card";
import { SectionCard } from "@/components/shared/section-card";
import { useTranslation } from "@/i18n/context";
import { getClassLevelById, getPrograms, getSchoolById } from "@/lib/data-source";
import { useAuth } from "@/store/auth-store";
import type { ClassLevel, Program, School } from "@/types";

const UPCOMING_PROGRAMS_LIMIT = 2;

export default function HomePage() {
  const { t } = useTranslation();
  const { profile } = useAuth();

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

  // Phase 6 introduces real Order/Receipt mock data; until then this is a
  // stand-in so the empty vs. has-receipts states can both be demonstrated.
  const hasReceipts = profile.id === "user-ritesh";

  return (
    <>
      <AppHeader
        title={t.appName}
        right={
          <Link
            href="/profile"
            aria-label={t.nav.profile}
            className="flex size-9 items-center justify-center rounded-full bg-section-workspace-bg text-brand"
          >
            <User className="size-5" />
          </Link>
        }
      />

      <div className="space-y-8 p-4 pb-8">
        <section className="rounded-2xl border border-line bg-card p-5">
          <p className="text-sm text-sub">{t.welcome},</p>
          <p className="font-heading text-xl font-bold text-ink">{profile.name}</p>
          {school ? (
            <p className="mt-2 text-sm text-sub">
              {school.name}
              {classLevel ? ` · ${classLevel.label}` : ""}
            </p>
          ) : null}
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-base font-semibold text-ink">{t.nav.essentials}</h2>
          <div className="grid grid-cols-3 gap-3">
            <Link href="/essentials">
              <SectionCard icon={BookOpen} title={t.essentials.books} accent="essentials" />
            </Link>
            <Link href="/essentials">
              <SectionCard icon={Shirt} title={t.essentials.uniform} accent="essentials" />
            </Link>
            <Link href="/essentials">
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
                    schoolName={school?.name ?? ""}
                    date={program.date}
                    venue={program.venue}
                    fee={program.fee}
                    seatsAvailable={program.seatsAvailable}
                    status={program.status}
                    href="/programs"
                  />
                ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-base font-semibold text-ink">{t.nav.receipts}</h2>
          {hasReceipts ? (
            <Link
              href="/receipts"
              className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4"
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
