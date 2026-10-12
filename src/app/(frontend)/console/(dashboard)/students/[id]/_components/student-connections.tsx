"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  label: string;
  status: string;
  createdAt: string;
  needsReview?: boolean;
}
interface StudentOverview {
  exchanges: Row[];
  subjectChanges: Row[];
  extraItems: Row[];
  support: Row[];
  payments: Row[];
  newAdmission: { isNew: boolean; setBought: boolean; academicYear: string } | null;
}

async function fetchOverview(id: string): Promise<StudentOverview> {
  const res = await fetch(`/api/console/student-overview?id=${encodeURIComponent(id)}`, { cache: "no-store", credentials: "same-origin" });
  if (!res.ok) throw new Error("Could not load.");
  return (await res.json()) as StudentOverview;
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-section-programs-bg text-section-programs",
  open: "bg-section-programs-bg text-section-programs",
  "in-progress": "bg-section-workspace-bg text-section-workspace",
  approved: "bg-section-workspace-bg text-section-workspace",
  paid: "bg-section-essentials-bg text-section-essentials",
  completed: "bg-section-essentials-bg text-section-essentials",
  used: "bg-section-essentials-bg text-section-essentials",
  resolved: "bg-section-essentials-bg text-section-essentials",
  rejected: "bg-section-pay-bg text-section-pay",
  failed: "bg-section-pay-bg text-section-pay",
};

function Group({ title, href, rows }: { title: string; href: string; rows: Row[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide text-sub uppercase">{title}</p>
        <Link href={href} className="text-xs font-medium text-brand hover:underline">
          Open tab
        </Link>
      </div>
      <ul className="divide-y divide-line rounded-lg border border-line/60">
        {rows.map((row) => (
          <li key={row.id} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="line-clamp-2 text-ink">
                {row.needsReview ? <AlertTriangle className="mr-1 inline size-3.5 text-section-pay" /> : null}
                {row.label}
              </p>
              <p className="text-xs text-sub">{formatDate(row.createdAt)}</p>
            </div>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", STATUS_STYLE[row.status] ?? "bg-muted text-sub")}>{row.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One student's whole picture across the console's features: uniform set status, payment attempts and every request. */
export function StudentConnections({ studentId }: { studentId: string }) {
  const { data } = useSWR(["console:student-overview", studentId], () => fetchOverview(studentId), { refreshInterval: 60_000 });
  const empty = data && !data.exchanges.length && !data.subjectChanges.length && !data.extraItems.length && !data.support.length && !data.payments.length;

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Requests &amp; payment attempts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!data ? (
          <div role="status" aria-label="Loading" className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            {data.newAdmission?.isNew ? (
              <p className="rounded-lg border border-section-programs/30 bg-section-programs-bg px-3 py-2 text-sm text-section-programs">
                New admission ({data.newAdmission.academicYear}) —{" "}
                {data.newAdmission.setBought ? "has bought the full uniform set." : "has not bought the full uniform set yet."}
              </p>
            ) : null}
            {empty ? <p className="text-sm text-sub">No requests or payment attempts yet.</p> : null}
            <div className="grid gap-4 md:grid-cols-2">
              <Group title="Payment attempts" href="/console/payment-attempts" rows={data.payments} />
              <Group title="Exchange requests" href="/console/exchange-requests" rows={data.exchanges} />
              <Group title="Subject changes" href="/console/subject-change-requests" rows={data.subjectChanges} />
              <Group title="Extra item requests" href="/console/extra-item-requests" rows={data.extraItems} />
              <Group title="Parent queries" href="/console/support" rows={data.support} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
