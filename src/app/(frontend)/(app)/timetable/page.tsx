"use client";

import { CalendarDays, Maximize2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "@/i18n/context";
import { getTimetableByClassLevel } from "@/lib/data-source";
import { useAuth } from "@/store/auth-store";
import type { Timetable, TimetablePeriod } from "@/types";

function TimetableGrid({ periods, dayLabels }: { periods: TimetablePeriod[]; dayLabels: string[] }) {
  const { t } = useTranslation();
  const dayKeys: (keyof Omit<TimetablePeriod, "label">)[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-line/60 bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-28">{t.timetable.periodColumnLabel}</TableHead>
            {dayKeys.map((key, i) => (
              <TableHead key={key} className="min-w-28">
                {dayLabels[i]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {periods.map((row, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium text-ink">{row.label}</TableCell>
              {dayKeys.map((key) => (
                <TableCell key={key} className="text-sub">
                  {row[key] || "—"}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TimetableContent({ timetable }: { timetable: Timetable }) {
  const { t } = useTranslation();
  const dayLabels = [
    t.timetable.monday,
    t.timetable.tuesday,
    t.timetable.wednesday,
    t.timetable.thursday,
    t.timetable.friday,
    t.timetable.saturday,
  ];

  return (
    <div className="space-y-6">
      <TimetableGrid periods={timetable.periods} dayLabels={dayLabels} />
      {timetable.notes.length > 0 ? (
        <div className="space-y-3">
          <h2 className="font-heading text-base font-semibold text-ink">{t.timetable.notesTitle}</h2>
          <div className="space-y-3">
            {timetable.notes.map((note, index) => (
              <div key={index} className="rounded-lg border border-line/60 bg-card p-4">
                <p className="font-medium text-ink">{note.heading}</p>
                {note.body ? <p className="mt-1 text-sm text-sub">{note.body}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function TimetablePage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [timetable, setTimetable] = useState<Timetable | null | undefined>(undefined);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    if (!profile) return;
    getTimetableByClassLevel(profile.schoolId, profile.classLevelId).then(setTimetable);
  }, [profile]);

  if (!profile) return null;

  return (
    <>
      <AppHeader
        title={t.timetable.title}
        showAvatar
        right={
          timetable ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsFullScreen(true)}>
              <Maximize2 className="size-4" />
              {t.timetable.fullScreenLabel}
            </Button>
          ) : null
        }
      />
      <div className="w-full space-y-4 p-4 pb-8 sm:space-y-5 sm:p-6 lg:p-8">
        <p className="text-sm text-sub">{t.timetable.subtitle}</p>

        {timetable === undefined ? null : timetable === null ? (
          <EmptyState
            icon={CalendarDays}
            title={t.timetable.emptyTitle}
            description={t.timetable.emptyDescription}
          />
        ) : (
          <TimetableContent timetable={timetable} />
        )}
      </div>

      {isFullScreen && timetable ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-card/95 px-4 py-3 backdrop-blur">
            <h1 className="font-heading text-lg font-semibold text-ink">{t.timetable.title}</h1>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsFullScreen(false)}>
              <X className="size-4" />
              {t.timetable.exitFullScreenLabel}
            </Button>
          </div>
          <div className="p-4 sm:p-6 lg:p-8">
            <TimetableContent timetable={timetable} />
          </div>
        </div>
      ) : null}
    </>
  );
}
