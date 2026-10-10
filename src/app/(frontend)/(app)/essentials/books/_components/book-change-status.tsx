"use client";

import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/context";
import { cancelBookChangeRequest } from "@/lib/data-source";
import type { BookChangeRequest, BookSelection } from "@/types";

/** Decided requests stay visible for a week, so the student sees the outcome without it lingering forever. */
const DECIDED_VISIBLE_MS = 7 * 24 * 60 * 60 * 1000;

export function isRequestVisible(request: BookChangeRequest | undefined, now = Date.now()): request is BookChangeRequest {
  if (!request) return false;
  if (request.status === "pending") return true;
  if (request.status === "cancelled") return false;
  return now - new Date(request.decidedAt ?? request.updatedAt).getTime() < DECIDED_VISIBLE_MS;
}

/** The newest request's state, shown above the selection: pending (cancellable) or the recent decision. */
export function BookChangeStatus({
  request,
  describe,
  onChanged,
}: {
  request: BookChangeRequest;
  describe: (selection: BookSelection) => string;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const p = t.bookLock;
  const [confirming, setConfirming] = useState(false);

  const view = {
    pending: { icon: Clock, title: p.pendingTitle, body: p.pendingDescription, tone: "border-section-programs/40 bg-section-programs-bg" },
    approved: { icon: CheckCircle2, title: p.approvedTitle, body: p.approvedDescription, tone: "border-section-essentials/40 bg-section-essentials-bg" },
    rejected: { icon: XCircle, title: p.rejectedTitle, body: p.rejectedDescription, tone: "border-section-pay/40 bg-section-pay-bg" },
    cancelled: { icon: XCircle, title: p.cancelledTitle, body: "", tone: "border-line bg-muted" },
  }[request.status];
  const Icon = view.icon;

  async function cancel() {
    setConfirming(false);
    try {
      await cancelBookChangeRequest(request.id);
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : p.cancelFailed);
    }
    onChanged();
  }

  return (
    <div className={`rounded-xl border p-4 ${view.tone}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-ink" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-heading text-sm font-semibold text-ink">{view.title}</p>
          <p className="text-sm text-sub">{view.body}</p>
          <p className="text-sm text-ink">
            <span className="text-sub">{p.requestedLabel}: </span>
            {describe(request.requested)}
          </p>
          {request.staffNote ? (
            <p className="text-sm text-ink">
              <span className="text-xs font-semibold tracking-wide text-sub uppercase">{p.noteFromSchool}: </span>
              {request.staffNote}
            </p>
          ) : null}
          {request.status === "pending" ? (
            <Button variant="outline" size="sm" className="mt-1" onClick={() => setConfirming(true)}>
              {p.cancelRequest}
            </Button>
          ) : null}
        </div>
      </div>
      <ConfirmDeleteDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={p.cancelConfirmTitle}
        description={p.cancelConfirmDescription}
        confirmLabel={p.cancelRequest}
        cancelLabel={p.keepRequest}
        onConfirm={cancel}
      />
    </div>
  );
}
