"use client";

import { AddressBlock } from "@/components/console/address-display";
import { Loader2, Mail, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { mailtoLink, telLink, whatsAppLink } from "@/lib/contact-links";
import { saveSupportContactNote, transitionSupportRequest, type SupportAction } from "@/lib/data-source";
import { formatDate, formatTime } from "@/lib/format";
import type { SupportRequestRecord, SupportStatus } from "@/types";

export const STATUS_LABELS: Record<SupportStatus, string> = {
  open: "Open",
  "in-progress": "In progress",
  resolved: "Resolved",
};

export const STATUS_STYLES: Record<SupportStatus, string> = {
  open: "bg-section-programs-bg text-section-programs",
  "in-progress": "bg-section-workspace-bg text-section-workspace",
  resolved: "bg-section-essentials-bg text-section-essentials",
};

/** One person's phone: tap to call, tap for WhatsApp. */
function PhoneActions({ phone, label }: { phone: string; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-ink">
        <span className="text-xs text-sub">{label}: </span>
        <span className="font-medium">{phone}</span>
      </span>
      <Button asChild size="sm" variant="outline" className="h-7 gap-1.5 px-2">
        <a href={telLink(phone)}>
          <Phone className="size-3.5" />
          Call
        </a>
      </Button>
      <Button asChild size="sm" variant="outline" className="h-7 gap-1.5 px-2">
        <a href={whatsAppLink(phone)} target="_blank" rel="noreferrer">
          <MessageCircle className="size-3.5" />
          WhatsApp
        </a>
      </Button>
    </div>
  );
}

function EmailAction({ email, label }: { email: string; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-ink">
        <span className="text-xs text-sub">{label}: </span>
        <span className="font-medium break-all">{email}</span>
      </span>
      <Button asChild size="sm" variant="outline" className="h-7 gap-1.5 px-2">
        <a href={mailtoLink(email, "Regarding your query to the school")}>
          <Mail className="size-3.5" />
          Email
        </a>
      </Button>
    </div>
  );
}

export function SupportDetailSheet({
  record,
  classLabel,
  onClose,
  onChanged,
}: {
  record: SupportRequestRecord | null;
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

function Body({ record, classLabel, onChanged }: { record: SupportRequestRecord; classLabel: string; onChanged: () => void }) {
  const [staffNote, setStaffNote] = useState("");
  const [contactNote, setContactNote] = useState(record.contactNote ?? "");
  const [busy, setBusy] = useState<SupportAction | "note" | null>(null);

  async function run(action: SupportAction) {
    setBusy(action);
    try {
      await transitionSupportRequest(record.id, action, { staffNote: staffNote.trim() || undefined });
      toast.success(
        action === "start" ? "Marked as in progress." : action === "resolve" ? "Marked as resolved." : "Reopened.",
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
      await saveSupportContactNote(record.id, contactNote);
      toast.success("Contact note saved.");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the note.");
    } finally {
      setBusy(null);
    }
  }

  // The number/email the family asked to be reached on, plus the profile's own if different.
  const phones = [...new Set([record.contactPhone, record.student.mobileNumber].filter((v): v is string => Boolean(v)))];
  const emails = [...new Set([record.contactEmail, record.student.email].filter((v): v is string => Boolean(v)))];

  return (
    <>
      <SheetHeader>
        <SheetTitle>Parent support query</SheetTitle>
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
          <div className="space-y-2">
            {phones.map((phone, i) => (
              <PhoneActions key={phone} phone={phone} label={i === 0 && phone === record.contactPhone ? "Asked to reach on" : "Profile phone"} />
            ))}
            {emails.map((email, i) => (
              <EmailAction key={email} email={email} label={i === 0 && email === record.contactEmail ? "Email" : "Profile email"} />
            ))}
            {phones.length === 0 && emails.length === 0 ? <p className="text-sm text-sub">No contact details on file.</p> : null}
          </div>
          <div>
            <p className="mb-1 text-xs text-sub">Delivery address</p>
            <AddressBlock address={record.student.address} fallbackPhone={record.student.mobileNumber} />
          </div>
        </section>

        <section className="space-y-1.5 rounded-xl border border-line/60 p-3.5">
          <p className="text-xs text-sub">Their message</p>
          <p className="text-sm whitespace-pre-wrap text-ink">{record.message}</p>
          <p className="pt-1 text-xs text-sub">
            Sent {formatDate(record.createdAt)} at {formatTime(record.createdAt)}
          </p>
        </section>

        {record.handledAt ? (
          <p className="text-xs text-sub">
            {record.status === "resolved" ? "Resolved" : "Picked up"} by {record.handledByName ?? "staff"} on{" "}
            {formatDate(record.handledAt)} at {formatTime(record.handledAt)}
            {record.staffNote ? <span className="mt-1 block text-sm text-ink">Note shown to the family: {record.staffNote}</span> : null}
          </p>
        ) : null}

        <section className="space-y-2">
          <Label htmlFor="support-contact-note" className="text-sm font-medium text-ink">
            Contact log (staff only)
          </Label>
          <Textarea
            id="support-contact-note"
            rows={3}
            value={contactNote}
            maxLength={1000}
            placeholder="e.g. Called at 11:30 — will visit the counter on Monday."
            onChange={(e) => setContactNote(e.target.value)}
          />
          <Button variant="outline" size="sm" disabled={busy !== null || contactNote === (record.contactNote ?? "")} onClick={saveNote}>
            {busy === "note" ? <Loader2 className="size-4 animate-spin" /> : null}
            Save note
          </Button>
        </section>

        <section className="space-y-3 border-t border-line pt-4">
          {record.status !== "resolved" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="support-staff-note" className="text-sm font-medium text-ink">
                  Reply note shown to the family (optional)
                </Label>
                <Textarea id="support-staff-note" rows={2} maxLength={500} value={staffNote} onChange={(e) => setStaffNote(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                {record.status === "open" ? (
                  <Button variant="outline" disabled={busy !== null} onClick={() => run("start")}>
                    {busy === "start" ? <Loader2 className="size-4 animate-spin" /> : null}
                    I&apos;m contacting them
                  </Button>
                ) : null}
                <Button disabled={busy !== null} onClick={() => run("resolve")}>
                  {busy === "resolve" ? <Loader2 className="size-4 animate-spin" /> : null}
                  Mark resolved
                </Button>
              </div>
            </>
          ) : (
            <Button variant="outline" disabled={busy !== null} onClick={() => run("reopen")}>
              {busy === "reopen" ? <Loader2 className="size-4 animate-spin" /> : null}
              Reopen
            </Button>
          )}
        </section>
      </div>
    </>
  );
}
