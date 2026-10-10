"use client";

import { Loader2, Mail, MessageSquareText, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/context";
import { createSupportRequest, getSchoolById, getSupportRequestsByUser } from "@/lib/data-source";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth-store";
import type { SupportStatus } from "@/types";

const MESSAGE_MAX = 1000;

const STATUS_STYLES: Record<SupportStatus, string> = {
  open: "bg-section-programs-bg text-section-programs",
  "in-progress": "bg-section-workspace-bg text-section-workspace",
  resolved: "bg-section-essentials-bg text-section-essentials",
};

export default function SupportPage() {
  const { t } = useTranslation();
  const p = t.supportPage;
  const { profile } = useAuth();
  const { data: school } = useSWR(profile ? ["support:school", profile.schoolId] : null, () => getSchoolById(profile!.schoolId));
  const { data: requests, mutate } = useSWR(profile ? ["support:requests", profile.id] : null, () =>
    getSupportRequestsByUser(profile!.id),
  );

  const [message, setMessage] = useState("");
  // Prefilled from the profile the first time it's known; the family can change them for this message.
  const [phone, setPhone] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (!profile) return null;
  const phoneValue = phone ?? profile.mobileNumber ?? "";
  const emailValue = email ?? profile.email ?? "";
  const canSend = message.trim().length >= 5 && (phoneValue.trim() !== "" || emailValue.trim() !== "") && !sending;

  const statusLabel: Record<SupportStatus, string> = {
    open: p.statusOpen,
    "in-progress": p.statusInProgress,
    resolved: p.statusResolved,
  };
  const statusHelp: Record<SupportStatus, string> = {
    open: p.helpOpen,
    "in-progress": p.helpInProgress,
    resolved: p.helpResolved,
  };

  async function send() {
    if (!canSend) return;
    setSending(true);
    try {
      await createSupportRequest({
        message: message.trim(),
        contactPhone: phoneValue.trim() || undefined,
        contactEmail: emailValue.trim() || undefined,
      });
      toast.success(p.successTitle, { description: p.successDescription });
      setMessage("");
      await mutate();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : p.sendFailed);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <AppHeader title={p.title} showAvatar />
      <div className="w-full space-y-6 p-4 pb-8 sm:p-6 lg:grid lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-8 lg:space-y-0 lg:p-8">
        <div className="space-y-5">
          <p className="text-sm text-sub">{p.subtitle}</p>

          <section className="space-y-4 rounded-xl border border-line/60 bg-card p-4 sm:p-5">
            <h2 className="font-heading text-base font-semibold text-ink">{p.askTitle}</h2>
            <div className="space-y-1.5">
              <Label htmlFor="support-message" className="text-sm font-medium text-ink">
                {p.messageLabel}
              </Label>
              <Textarea
                id="support-message"
                rows={5}
                maxLength={MESSAGE_MAX}
                value={message}
                placeholder={p.messagePlaceholder}
                onChange={(e) => setMessage(e.target.value)}
              />
              <p className="text-right text-xs text-sub">
                {message.length}/{MESSAGE_MAX}
              </p>
            </div>

            <div className="space-y-3 rounded-lg bg-muted/40 p-3">
              <div>
                <p className="text-sm font-medium text-ink">{p.contactHeading}</p>
                <p className="text-xs text-sub">{p.contactHint}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="support-phone" className="text-xs text-sub">
                    {p.phoneLabel}
                  </Label>
                  <Input
                    id="support-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phoneValue}
                    maxLength={20}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="support-email" className="text-xs text-sub">
                    {p.emailLabel}
                  </Label>
                  <Input
                    id="support-email"
                    type="email"
                    autoComplete="email"
                    value={emailValue}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              {phoneValue.trim() === "" && emailValue.trim() === "" ? (
                <p className="text-xs text-destructive">{p.needContact}</p>
              ) : null}
            </div>

            <Button className="w-full sm:w-auto" disabled={!canSend} onClick={send}>
              {sending ? <Loader2 className="size-4 animate-spin" /> : null}
              {sending ? p.sending : p.send}
            </Button>
          </section>

          {school ? (
            <section className="rounded-xl border border-line/60 bg-card p-4 sm:p-5">
              <p className="mb-3 text-sm font-medium text-ink">{p.schoolContactTitle}</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <a href={`tel:${school.contactPhone}`}>
                    <Phone className="size-4" />
                    {p.callSchool}
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <a href={`mailto:${school.contactEmail}`}>
                    <Mail className="size-4" />
                    {p.emailSchool}
                  </a>
                </Button>
              </div>
            </section>
          ) : null}
        </div>

        <section className="space-y-3">
          <h2 className="font-heading text-base font-semibold text-ink">{p.myQueries}</h2>
          {requests === undefined ? null : requests.length === 0 ? (
            <EmptyState icon={MessageSquareText} title={p.noQueriesTitle} description={p.noQueriesDescription} />
          ) : (
            <ul className="space-y-2.5">
              {requests.map((request) => (
                <li key={request.id} className="rounded-lg border border-line/60 bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 text-sm whitespace-pre-wrap text-ink">{request.message}</p>
                    <Badge variant="secondary" className={cn("shrink-0 border-transparent font-medium", STATUS_STYLES[request.status])}>
                      {statusLabel[request.status]}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-sub">{statusHelp[request.status]}</p>
                  {request.staffNote ? (
                    <p className="mt-2 rounded-md bg-muted px-3 py-2 text-sm text-ink">
                      <span className="text-xs font-semibold tracking-wide text-sub uppercase">{p.noteFromSchool}: </span>
                      {request.staffNote}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-sub">
                    {p.sentOn} {formatDate(request.createdAt)}, {formatTime(request.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
