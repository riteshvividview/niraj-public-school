"use client";

import { AddressBlock } from "@/components/console/address-display";
import { AlertTriangle, ArrowRight, Loader2, Mail, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { getReceiptsByUser, saveBookChangeContactNote, transitionBookChangeRequest } from "@/lib/data-source";
import { formatDate, formatTime } from "@/lib/format";
import type { BookChangeRequestRecord, BookChangeStatus, BookSelection } from "@/types";

export const STATUS_LABELS: Record<BookChangeStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const STATUS_STYLES: Record<BookChangeStatus, string> = {
  pending: "bg-section-programs-bg text-section-programs",
  approved: "bg-section-essentials-bg text-section-essentials",
  rejected: "bg-section-pay-bg text-section-pay",
  cancelled: "bg-section-console-bg text-section-console",
};

const LANGUAGE: Record<string, string> = { hindi: "Hindi", telugu: "Telugu" };
const STREAM: Record<string, string> = { science: "Science", economics: "Economics" };
const ELECTIVE: Record<string, string> = { ena: "ENA", roboticsAI: "Robotics & AI", homeScience: "Home Science" };

const FIELDS: Array<{ key: keyof BookSelection; label: string; names: Record<string, string> }> = [
  { key: "secondLanguage", label: "Second language", names: LANGUAGE },
  { key: "stream", label: "Specialization", names: STREAM },
  { key: "elective", label: "Specialization 2", names: ELECTIVE },
];

/** "Second language: Hindi → Telugu" lines for every field the student asked to change. */
export function changeLines(record: Pick<BookChangeRequestRecord, "current" | "requested">) {
  return FIELDS.filter((f) => record.requested[f.key]).map((f) => ({
    label: f.label,
    from: record.current[f.key] ? f.names[record.current[f.key]!] : "—",
    to: f.names[record.requested[f.key]!],
  }));
}

export function BookChangeDetailSheet({
  record,
  classLabel,
  onClose,
  onChanged,
}: {
  record: BookChangeRequestRecord | null;
  classLabel: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  return (
    <Sheet open={record !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {record ? <Body key={`${record.id}:${record.status}`} record={record} classLabel={classLabel} onChanged={onChanged} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function Body({
  record,
  classLabel,
  onChanged,
}: {
  record: BookChangeRequestRecord;
  classLabel: string;
  onChanged: () => void;
}) {
  const [staffNote, setStaffNote] = useState("");
  const [contactNote, setContactNote] = useState(record.contactNote ?? "");
  const [busy, setBusy] = useState<"approve" | "reject" | "note" | null>(null);

  // Heads-up for staff: books already bought for the OLD set aren't touched by an approval.
  const { data: receipts } = useSWR(["console:book-change:receipts", record.userId], () => getReceiptsByUser(record.userId));
  const boughtBooks = receipts?.filter((r) => r.order.items.some((item) => item.kind === "book")).length ?? 0;

  async function run(action: "approve" | "reject") {
    if (action === "reject" && staffNote.trim().length < 3) {
      toast.error("Please add a short note explaining the decision.");
      return;
    }
    setBusy(action);
    try {
      await transitionBookChangeRequest(record.id, action, { staffNote: staffNote.trim() || undefined });
      toast.success(
        action === "approve"
          ? "Approved — the student's profile was updated and they have been notified."
          : "Rejected — the student has been notified.",
      );
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
      onChanged();
    } finally {
      setBusy(null);
    }
  }

  async function saveNote() {
    setBusy("note");
    try {
      await saveBookChangeContactNote(record.id, contactNote);
      toast.success("Contact note saved.");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the note.");
    } finally {
      setBusy(null);
    }
  }

  const lines = changeLines(record);

  return (
    <>
      <SheetHeader>
        <SheetTitle>Subject change request</SheetTitle>
        <SheetDescription>
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[record.status]}`}>
            {STATUS_LABELS[record.status]}
          </span>
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-5 px-4 pb-6">
        <section className="space-y-3 rounded-xl border border-line/60 p-3.5">
          <div>
            <p className="text-xs text-sub">Student</p>
            <p className="text-sm font-medium text-ink">
              {record.student.name}
              <span className="font-normal text-sub">
                {" "}
                · {record.student.registerNumber} · {classLabel}
                {record.student.section ? ` - ${record.student.section}` : ""}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {record.student.mobileNumber ? (
              <a href={`tel:${record.student.mobileNumber}`} className="flex items-center gap-1.5 font-medium text-brand hover:underline">
                <Phone className="size-3.5" />
                {record.student.mobileNumber}
              </a>
            ) : (
              <span className="flex items-center gap-1.5 text-sub">
                <Phone className="size-3.5" />
                No phone on file
              </span>
            )}
            {record.student.email ? (
              <a href={`mailto:${record.student.email}`} className="flex items-center gap-1.5 font-medium text-brand hover:underline">
                <Mail className="size-3.5" />
                {record.student.email}
              </a>
            ) : (
              <span className="flex items-center gap-1.5 text-sub">
                <Mail className="size-3.5" />
                No email on file
              </span>
            )}
          </div>
          <div>
            <p className="mb-1 text-xs text-sub">Delivery address</p>
            <AddressBlock address={record.student.address} fallbackPhone={record.student.mobileNumber} />
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-line/60 p-3.5">
          <p className="text-xs text-sub">Requested change</p>
          {lines.map((line) => (
            <div key={line.label} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="w-36 shrink-0 text-sub">{line.label}</span>
              <span className="font-medium text-ink">{line.from}</span>
              <ArrowRight className="size-3.5 text-sub" />
              <span className="font-semibold text-ink">{line.to}</span>
            </div>
          ))}
          <div>
            <p className="text-xs text-sub">Student&apos;s reason</p>
            <p className="text-sm text-ink">{record.reason}</p>
          </div>
        </section>

        {boughtBooks > 0 && record.status === "pending" ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-section-programs/40 bg-section-programs-bg p-3 text-sm text-ink">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-section-programs" />
            <p>
              This student has already paid for books on {boughtBooks} receipt{boughtBooks > 1 ? "s" : ""}. Approving changes
              what they see from now on — <strong>it does not alter orders already placed</strong>. Sort out any
              books already bought at the counter.
            </p>
          </div>
        ) : null}

        <section className="space-y-1 text-xs text-sub">
          <p>
            Requested {formatDate(record.createdAt)} at {formatTime(record.createdAt)}
          </p>
          {record.decidedAt ? (
            <p>
              {record.status === "approved" ? "Approved" : "Rejected"} by {record.decidedByName ?? "staff"} on{" "}
              {formatDate(record.decidedAt)}
            </p>
          ) : null}
          {record.staffNote ? <p className="text-sm text-ink">Staff note: {record.staffNote}</p> : null}
        </section>

        <section className="space-y-2">
          <Label htmlFor="book-change-contact-note" className="text-sm font-medium text-ink">
            Contact log (staff only)
          </Label>
          <Textarea
            id="book-change-contact-note"
            rows={3}
            value={contactNote}
            maxLength={1000}
            placeholder="e.g. Called the parent — confirmed they want Telugu as second language."
            onChange={(e) => setContactNote(e.target.value)}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={busy !== null || contactNote === (record.contactNote ?? "")}
            onClick={saveNote}
          >
            {busy === "note" ? <Loader2 className="size-4 animate-spin" /> : null}
            Save note
          </Button>
        </section>

        {record.status === "pending" ? (
          <section className="space-y-3 border-t border-line pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="book-change-staff-note" className="text-sm font-medium text-ink">
                Note to the student (required to reject)
              </Label>
              <Textarea
                id="book-change-staff-note"
                rows={2}
                maxLength={500}
                value={staffNote}
                onChange={(e) => setStaffNote(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy !== null} onClick={() => run("approve")}>
                {busy === "approve" ? <Loader2 className="size-4 animate-spin" /> : null}
                Approve &amp; apply
              </Button>
              <Button variant="destructive" disabled={busy !== null} onClick={() => run("reject")}>
                {busy === "reject" ? <Loader2 className="size-4 animate-spin" /> : null}
                Reject
              </Button>
            </div>
            <p className="text-xs text-sub">
              Approving updates the student&apos;s language / specialization immediately, so their Books page and cart follow the new set.
            </p>
          </section>
        ) : null}
      </div>
    </>
  );
}
