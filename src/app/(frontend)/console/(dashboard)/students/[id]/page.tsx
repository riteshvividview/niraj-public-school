"use client";

import { ArrowLeft, KeyRound, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { ConsoleListSkeleton } from "@/components/shared/console-list-skeleton";
import { StatusBadge, toBadgeStatus } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { deriveReceiptTitle } from "@/lib/cart-items";
import { RecordEventRow } from "@/components/console/record-event-list";
import { deleteStudent, getReceiptsByUser, getRecordEventsByStudent, getUserProfileById } from "@/lib/data-source";
import { formatDate, formatTime } from "@/lib/format";
import { classLevelsCacheUpdater, useClassLevels } from "@/lib/hooks/console-data";
import {
  EditStudentForm,
  electiveLabel,
  firstLanguageOf,
  ResetPasswordForm,
  secondLanguageOf,
} from "../_components/student-shared";
import type { ReceiptRecord } from "@/types";

const RECEIPT_TITLE_LABELS = {
  books: "Books",
  uniform: "Uniform",
  receiptWord: "Receipt",
  programmeReceiptWord: "Programme Receipt",
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <span className="text-sub">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </div>
  );
}

function ReceiptHistoryCard({ record }: { record: ReceiptRecord }) {
  const [expanded, setExpanded] = useState(false);
  const title = deriveReceiptTitle(record.order.items, RECEIPT_TITLE_LABELS);
  return (
    <div className="rounded-xl border border-line/60 p-3.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{title}</p>
          <p className="mt-0.5 text-xs text-sub">
            {record.receipt.qrPayload} · {formatDate(record.receipt.issuedAt)} ·{" "}
            {formatTime(record.receipt.issuedAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-medium text-ink">₹{record.order.totalAmount}</span>
          <StatusBadge status={toBadgeStatus(record.receipt.redemptionStatus)} />
        </div>
      </button>
      {expanded ? (
        <div className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
          <p className="text-sub">Payment method: {record.order.paymentMethod.toUpperCase()}</p>
          <ul className="divide-y divide-line">
            {record.order.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-1.5">
                <div className="min-w-0">
                  <p className="truncate text-ink">{item.label}</p>
                  {item.meta ? <p className="text-xs text-sub">{item.meta}</p> : null}
                  {item.quantity > 1 ? <p className="text-xs text-sub">Qty {item.quantity}</p> : null}
                  {item.kind !== "program" ? (
                    <p className={`text-xs font-medium ${item.collectedAt ? "text-section-essentials" : "text-warm"}`}>
                      {item.collectedAt
                        ? `Collected ${formatDate(item.collectedAt)} · ${formatTime(item.collectedAt)}`
                        : "Pending collection"}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 font-medium text-ink">
                  ₹{item.unitPrice * item.quantity}
                </span>
              </li>
            ))}
          </ul>
          {record.receipt.redeemedAt ? (
            <p className="text-xs text-sub">
              Redeemed {formatDate(record.receipt.redeemedAt)} at {formatTime(record.receipt.redeemedAt)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const studentId = params.id;

  const {
    data: student,
    mutate: mutateStudent,
  } = useSWR(["console:student", studentId], () => getUserProfileById(studentId));
  const { classLevels, mutateClassLevels } = useClassLevels(student?.schoolId ?? "");
  const { data: receiptsData } = useSWR(["console:student-receipts", studentId], () =>
    getReceiptsByUser(studentId),
  );
  const receipts = receiptsData ?? null;
  const { data: history } = useSWR(["console:student-history", studentId], () => getRecordEventsByStudent(studentId, 50));

  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const onClassLevelsChange = classLevelsCacheUpdater(mutateClassLevels);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteStudent(studentId);
      toast.success("Student deleted");
      router.push("/console/students");
    } catch (error) {
      // e.g. "This student has order or request history, which the school keeps permanently…"
      toast.error(error instanceof Error ? error.message : "Could not delete the student.");
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  }

  const classLabel = classLevels.find((level) => level.id === student?.classLevelId)?.label;

  return (
    <div className="space-y-6">
      <Link
        href="/console/students"
        className="inline-flex items-center gap-1.5 text-sm text-sub transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Back to Students
      </Link>

      {student === undefined ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          </div>
          <ConsoleListSkeleton rows={3} />
        </div>
      ) : student === null ? (
        <p className="rounded-xl border border-line/60 py-10 text-center text-sm text-sub">
          This student couldn&apos;t be found — they may have been deleted.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <UserAvatar name={student.name} avatarUrl={student.avatarUrl} size="lg" />
              <div>
                <h1 className="font-heading text-2xl font-bold text-ink">{student.name}</h1>
                <p className="text-sm text-sub">
                  {student.registerNumber} · {classLabel ?? "—"}
                  {student.section ? ` · Sec ${student.section}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                Edit
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => setResetOpen(true)}>
                <KeyRound className="size-4" />
                Reset Password
              </Button>
              <Button
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Student Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-line">
                  <InfoRow label="Name" value={student.name} />
                  <InfoRow label="Register Number" value={student.registerNumber} />
                  <InfoRow label="Class" value={classLabel ?? "—"} />
                  <InfoRow label="Section" value={student.section ?? "—"} />
                  <InfoRow
                    label="Gender"
                    value={student.gender ? student.gender[0].toUpperCase() + student.gender.slice(1) : "—"}
                  />
                  <InfoRow
                    label="First Language"
                    value={firstLanguageOf(student) ? firstLanguageOf(student)!.replace(/^\w/, (c) => c.toUpperCase()) : "—"}
                  />
                  <InfoRow
                    label="Second Language"
                    value={secondLanguageOf(student) ? secondLanguageOf(student)!.replace(/^\w/, (c) => c.toUpperCase()) : "—"}
                  />
                  <InfoRow
                    label="Specialization 1"
                    value={student.stream ? student.stream.replace(/^\w/, (c) => c.toUpperCase()) : "—"}
                  />
                  <InfoRow label="Specialization 2" value={electiveLabel(student.elective)} />
                  <InfoRow label="Mobile Number" value={student.mobileNumber ?? "—"} />
                  <InfoRow label="Email" value={student.email ?? "—"} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Receipt History</CardTitle>
              </CardHeader>
              <CardContent>
                {receipts === null ? (
                  <ConsoleListSkeleton rows={3} />
                ) : receipts.length === 0 ? (
                  <p className="rounded-xl border border-line/60 py-8 text-center text-sm text-sub">
                    No purchases yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {receipts.map((record) => (
                      <ReceiptHistoryCard key={record.receipt.id} record={record} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle>Activity history</CardTitle>
                <Link
                  href={`/console/records?q=${encodeURIComponent(student.registerNumber)}`}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  Open in Records &amp; History
                </Link>
              </CardHeader>
              <CardContent>
                {history === undefined ? (
                  <ConsoleListSkeleton />
                ) : history.length === 0 ? (
                  <p className="rounded-xl border border-line/60 py-8 text-center text-sm text-sub">No activity recorded yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {history.map((event) => (
                      <RecordEventRow key={event.id} event={event} showStudent={false} />
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Student</DialogTitle>
              </DialogHeader>
              {editOpen ? (
                <EditStudentForm
                  student={student}
                  classLevels={classLevels}
                  onClassLevelsChange={onClassLevelsChange}
                  onDone={() => {
                    setEditOpen(false);
                    mutateStudent();
                  }}
                />
              ) : null}
            </DialogContent>
          </Dialog>

          <Dialog open={resetOpen} onOpenChange={setResetOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset Password</DialogTitle>
              </DialogHeader>
              {resetOpen ? (
                <ResetPasswordForm student={student} onDone={() => setResetOpen(false)} />
              ) : null}
            </DialogContent>
          </Dialog>

          <ConfirmDeleteDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title="Delete this student?"
            description={`This permanently removes ${student.name} (${student.registerNumber}) and their portal access. A student who has any order or request history can't be deleted — that history is kept permanently.`}
            confirmLabel={isDeleting ? "Deleting…" : "Delete Student"}
            onConfirm={handleDelete}
          />
        </>
      )}
    </div>
  );
}
