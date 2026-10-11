"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateBookContents } from "@/lib/data-source";
import type { Book, BookContentItem, BookContentSection } from "@/types";

export const SECTION_LABELS: Record<BookContentSection, string> = {
  textbook: "Textbooks",
  notebook: "Notebooks",
  stationery: "Stationery & other items",
};
const SECTIONS: BookContentSection[] = ["textbook", "notebook", "stationery"];

/**
 * What is inside a book set. No prices here — only the set itself is priced.
 * This is the list staff tick off at the counter when a parent collects; an
 * order keeps the list it was placed with, so editing only affects new orders.
 */
export function BookContentsDialog({
  book,
  open,
  onOpenChange,
  onSaved,
}: {
  book: Book | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {book ? <Body key={book.id} book={book} onClose={() => onOpenChange(false)} onSaved={onSaved} /> : null}
      </DialogContent>
    </Dialog>
  );
}

type Row = Omit<BookContentItem, "id">;

function Body({ book, onClose, onSaved }: { book: Book; onClose: () => void; onSaved: () => void }) {
  const [rows, setRows] = useState<Row[]>(() => (book.contents ?? []).map((item) => ({ section: item.section, subject: item.subject, name: item.name, publisher: item.publisher, detail: item.detail, quantity: item.quantity, starred: item.starred })));
  const [section, setSection] = useState<BookContentSection>("textbook");
  const [subject, setSubject] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [starred, setStarred] = useState(false);
  const [saving, setSaving] = useState(false);

  function addRow() {
    if (!name.trim()) return;
    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    setRows((prev) => [...prev, { section, subject: subject.trim() || undefined, name: name.trim(), quantity: qty, starred }]);
    setName("");
    setQuantity("1");
  }

  async function save() {
    setSaving(true);
    try {
      await updateBookContents(book.id, rows);
      toast.success("Book set items saved");
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the items.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Items in &quot;{book.title}&quot;</DialogTitle>
        <DialogDescription>
          Parents only see and pay for the set. These are what staff tick off as each one is handed over. No prices here.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {SECTIONS.map((key) => {
          const list = rows.map((row, index) => ({ row, index })).filter(({ row }) => row.section === key);
          if (list.length === 0) return null;
          return (
            <div key={key} className="space-y-1.5">
              <p className="text-sm font-semibold text-ink">
                {SECTION_LABELS[key]} <span className="font-normal text-sub">({list.length})</span>
              </p>
              <ul className="divide-y divide-line rounded-lg border border-line">
                {list.map(({ row, index }) => (
                  <li key={index} className="flex items-start gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="text-ink">
                        {row.name}
                        {row.quantity > 1 ? <span className="text-sub"> × {row.quantity}</span> : null}
                        {row.starred ? <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[11px] text-sub">given in class</span> : null}
                      </p>
                      <p className="text-xs text-sub">{[row.subject, row.publisher, row.detail].filter(Boolean).join(" · ")}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      aria-label={`Remove ${row.name}`}
                      onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {rows.length === 0 ? <p className="text-sm text-sub">Nothing listed for this set yet.</p> : null}

        <div className="space-y-3 rounded-lg border border-dashed border-line p-3">
          <p className="text-sm font-medium text-ink">Add an item</p>
          <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={section} onValueChange={(v) => setSection(v as BookContentSection)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {SECTION_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maths note book (200 pages)" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_90px_auto] sm:items-end">
            <div className="space-y-1">
              <Label className="text-xs">Subject (optional)</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Maths" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Qty</Label>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm text-ink">
              <Checkbox checked={starred} onCheckedChange={(v) => setStarred(v === true)} />
              Given in class
            </label>
          </div>
          <Button type="button" size="sm" variant="outline" disabled={!name.trim()} onClick={addRow}>
            <Plus className="size-4" /> Add to list
          </Button>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Save items
        </Button>
      </DialogFooter>
    </>
  );
}
