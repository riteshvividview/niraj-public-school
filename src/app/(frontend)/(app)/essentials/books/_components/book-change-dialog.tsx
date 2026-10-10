"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/context";
import { createBookChangeRequest } from "@/lib/data-source";
import type { AcademicLanguage, BookSelection, Elective, Stream } from "@/types";

const KEEP = "__keep__";

export interface ChangeableField<T extends string> {
  /** What the school assigned. */
  current: T;
  /** Every option the class offers (including the current one). */
  options: T[];
  label: (value: T) => string;
}

export interface ChangeableFields {
  secondLanguage?: ChangeableField<AcademicLanguage>;
  stream?: ChangeableField<Stream>;
  elective?: ChangeableField<Elective>;
}

/**
 * "Request a change" — only the fields the school has assigned (and so are
 * locked on the Books page) appear here. The student may ask to change any
 * subset of them, with a reason; the school decides.
 */
export function BookChangeDialog({
  open,
  onOpenChange,
  fields,
  titles,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: ChangeableFields;
  /** Section titles, same wording as the Books page groups. */
  titles: { secondLanguage: string; stream: string; elective: string };
  onSent: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        {open ? <Body fields={fields} titles={titles} onClose={() => onOpenChange(false)} onSent={onSent} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function Body({
  fields,
  titles,
  onClose,
  onSent,
}: {
  fields: ChangeableFields;
  titles: { secondLanguage: string; stream: string; elective: string };
  onClose: () => void;
  onSent: () => void;
}) {
  const { t } = useTranslation();
  const p = t.bookLock;
  const [choice, setChoice] = useState<Record<keyof ChangeableFields, string>>({
    secondLanguage: KEEP,
    stream: KEEP,
    elective: KEEP,
  });
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const wanted: BookSelection = {
    secondLanguage: choice.secondLanguage !== KEEP ? (choice.secondLanguage as AcademicLanguage) : undefined,
    stream: choice.stream !== KEEP ? (choice.stream as Stream) : undefined,
    elective: choice.elective !== KEEP ? (choice.elective as Elective) : undefined,
  };
  const hasChange = Boolean(wanted.secondLanguage || wanted.stream || wanted.elective);
  const canSubmit = hasChange && reason.trim().length >= 3 && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await createBookChangeRequest({ ...wanted, reason: reason.trim() });
      toast.success(p.successTitle, { description: p.successDescription });
      onSent();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : p.submitFailed);
      setSubmitting(false);
    }
  }

  function picker<T extends string>(key: keyof ChangeableFields, title: string, field: ChangeableField<T> | undefined) {
    if (!field) return null;
    const others = field.options.filter((option) => option !== field.current);
    if (others.length === 0) return null;
    return (
      <div className="space-y-1.5" key={key}>
        <Label className="text-sm font-medium text-ink">{title}</Label>
        <p className="text-xs text-sub">
          {p.currentLabel}: <span className="font-semibold text-ink">{field.label(field.current)}</span>
        </p>
        <Select value={choice[key]} onValueChange={(value) => setChoice((c) => ({ ...c, [key]: value }))}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={KEEP}>{p.keepAsIs}</SelectItem>
            {others.map((option) => (
              <SelectItem key={option} value={option}>
                {field.label(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{p.changeDialogTitle}</DialogTitle>
        <DialogDescription>{p.changeDialogDescription}</DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
        {picker("secondLanguage", titles.secondLanguage, fields.secondLanguage)}
        {picker("stream", titles.stream, fields.stream)}
        {picker("elective", titles.elective, fields.elective)}

        <div className="space-y-1.5">
          <Label htmlFor="book-change-reason" className="text-sm font-medium text-ink">
            {p.reasonLabel}
          </Label>
          <Textarea
            id="book-change-reason"
            rows={3}
            maxLength={300}
            value={reason}
            placeholder={p.reasonPlaceholder}
            onChange={(e) => setReason(e.target.value)}
          />
          <p className="text-right text-xs text-sub">{reason.length}/300</p>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          {t.common.back}
        </Button>
        <Button onClick={submit} disabled={!canSubmit}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {submitting ? p.submitting : p.submit}
        </Button>
      </DialogFooter>
    </>
  );
}
