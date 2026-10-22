"use client";

import Link from "next/link";
import { categoryOfEvent, eventLabel, type RecordEventCategory } from "@/lib/record-events";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RecordEvent } from "@/types";

const CATEGORY_STYLES: Record<RecordEventCategory, string> = {
  orders: "bg-section-workspace-bg text-section-workspace",
  collection: "bg-section-essentials-bg text-section-essentials",
  exchange: "bg-section-programs-bg text-section-programs",
  subject: "bg-section-console-bg text-section-console",
  support: "bg-section-pay-bg text-section-pay",
  profile: "bg-muted text-sub",
  class: "bg-section-essentials-bg text-section-essentials",
};

/** One line of the permanent activity log: exact date + time, what happened, who did it. */
export function RecordEventRow({ event, showStudent = true }: { event: RecordEvent; showStudent?: boolean }) {
  const category = categoryOfEvent(event.eventType);
  return (
    <li className="rounded-xl border border-line/60 p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", CATEGORY_STYLES[category])}>
          {eventLabel(event.eventType)}
        </span>
        <time dateTime={event.createdAt} className="text-xs text-sub">
          {formatDate(event.createdAt)} · {formatTime(event.createdAt)}
        </time>
      </div>
      <p className="mt-1.5 text-sm text-ink">{event.summary}</p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-sub">
        {showStudent ? (
          <Link href={`/console/students/${event.studentId}`} className="font-medium text-brand hover:underline">
            {event.studentName}
            {event.registerNumber ? ` · ${event.registerNumber}` : ""}
          </Link>
        ) : null}
        {event.receiptCode ? <span className="font-mono tracking-wider">{event.receiptCode}</span> : null}
        <span>
          by {event.actorName ?? (event.actorType === "system" ? "System" : event.actorType)}
          {event.actorType === "staff" ? " (staff)" : event.actorType === "student" ? " (student/parent)" : ""}
        </span>
      </p>
    </li>
  );
}
