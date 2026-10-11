"use client";

import { CheckCircle2, ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { groupItemsByKind } from "@/lib/cart-items";
import { cn } from "@/lib/utils";
import type { OrderItem, OrderItemPart, ReceiptRecord } from "@/types";

const CATEGORY_LABELS: Record<"books" | "uniform" | "programs", string> = {
  books: "Books",
  uniform: "Uniform & Kit",
  programs: "Programs",
};

const SECTION_LABELS: Record<OrderItemPart["section"], string> = {
  textbook: "Textbooks",
  notebook: "Notebooks",
  stationery: "Stationery & other items",
};
const SECTIONS: OrderItemPart["section"][] = ["textbook", "notebook", "stationery"];

const hasParts = (item: OrderItem) => (item.parts?.length ?? 0) > 0;

/**
 * Per-item collected/uncollected checkboxes plus one "Mark all collected"
 * button per category (Books / Uniform & Kit). A book set also lists what is
 * inside it (textbooks, notebooks, stationery) so each can be handed over — or
 * left for later — on its own; the set counts as collected once every item is.
 * Every toggle only changes local state — nothing is written until "Save
 * changes" is clicked, which sends every pending change in a single request
 * (and one email to the parent). Un-checking an already-collected item (a
 * staff correction) asks for confirmation before the toggle is even staged.
 * `pending` is keyed by an order line id, or by a book-set item's id.
 */
export function CollectionControls({
  record,
  isSaving,
  onSave,
}: {
  record: ReceiptRecord;
  isSaving: boolean;
  onSave: (changes: Record<string, boolean>) => void;
}) {
  const grouped = groupItemsByKind(record.order.items) as Record<"books" | "uniform" | "programs", OrderItem[]>;
  const categories = (["books", "uniform"] as const).filter((key) => grouped[key].length > 0);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [uncollectTarget, setUncollectTarget] = useState<{ label: string; apply: () => void } | null>(null);

  if (categories.length === 0) return null;

  function partCollected(part: OrderItemPart): boolean {
    return part.id in pending ? pending[part.id] : Boolean(part.collectedAt);
  }
  function isCollected(item: OrderItem): boolean {
    if (hasParts(item)) return (item.parts ?? []).every(partCollected);
    return item.id in pending ? pending[item.id] : Boolean(item.collectedAt);
  }

  function stage(key: string, persisted: boolean, collected: boolean) {
    setPending((prev) => {
      const next = { ...prev };
      // Persisted state matches the request again — nothing to save for this row.
      if (collected === persisted) delete next[key];
      else next[key] = collected;
      return next;
    });
  }

  /** Sets a line (or, for a book set, every item in it) — used by the bulk buttons, no confirmation. */
  function setLine(item: OrderItem, collected: boolean) {
    if (hasParts(item)) (item.parts ?? []).forEach((part) => stage(part.id, Boolean(part.collectedAt), collected));
    else stage(item.id, Boolean(item.collectedAt), collected);
  }

  /** A single checkbox: reversing something already saved as collected asks first. */
  function toggle(label: string, persisted: boolean, current: boolean, checked: boolean, apply: () => void) {
    if (!checked && current && persisted) {
      setUncollectTarget({ label, apply });
      return;
    }
    apply();
  }

  const changedCount = Object.keys(pending).length;

  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const items = grouped[category];
        const stillUncollected = items.filter((item) => !isCollected(item));
        return (
          <div key={category} className="space-y-2 rounded-xl border border-line p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ink">{CATEGORY_LABELS[category]}</span>
              {stillUncollected.length > 0 ? (
                <Button size="sm" variant="outline" onClick={() => stillUncollected.forEach((item) => setLine(item, true))}>
                  Mark all {CATEGORY_LABELS[category].toLowerCase()} collected
                </Button>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-section-essentials">
                  <CheckCircle2 className="size-3.5" /> All collected
                </span>
              )}
            </div>
            <ul className="divide-y divide-line">
              {items.map((item) => {
                const parts = item.parts ?? [];
                const collected = isCollected(item);
                const doneCount = parts.filter(partCollected).length;
                const isDirty = hasParts(item) ? parts.some((part) => part.id in pending) : item.id in pending;
                const open = !collapsed[item.id];
                return (
                  <li key={item.id} className="py-2 text-sm">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={hasParts(item) && doneCount > 0 && !collected ? "indeterminate" : collected}
                        onCheckedChange={(checked) => {
                          const want = checked === true;
                          // Un-checking a set that was already saved as collected: confirm once.
                          const savedCollected = hasParts(item) ? parts.every((p) => p.collectedAt) : Boolean(item.collectedAt);
                          toggle(item.label, savedCollected, collected, want, () => setLine(item, want));
                        }}
                        aria-label={`Mark ${item.label} collected`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-ink">{item.label}</p>
                        {item.meta ? <p className="truncate text-xs text-sub">{item.meta}</p> : null}
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-xs font-medium",
                          isDirty ? "text-section-programs" : collected ? "text-section-essentials" : doneCount > 0 ? "text-section-programs" : "text-sub",
                        )}
                      >
                        {hasParts(item)
                          ? isDirty
                            ? `${doneCount} of ${parts.length} · unsaved`
                            : `${doneCount} of ${parts.length} collected`
                          : isDirty
                            ? collected
                              ? "Will mark collected"
                              : "Will mark uncollected"
                            : collected
                              ? `Collected ${item.collectedAt ? new Date(item.collectedAt).toLocaleDateString() : ""}`
                              : "Not collected"}
                      </span>
                      {hasParts(item) ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0"
                          aria-label={open ? "Hide items" : "Show items"}
                          onClick={() => setCollapsed((prev) => ({ ...prev, [item.id]: open }))}
                        >
                          <ChevronDown className={cn("size-4 transition-transform", open ? "rotate-180" : "")} />
                        </Button>
                      ) : null}
                    </div>

                    {hasParts(item) && open ? (
                      <div className="mt-2 space-y-3 rounded-lg bg-muted/40 p-3">
                        {SECTIONS.map((section) => {
                          const list = parts.filter((part) => part.section === section);
                          if (list.length === 0) return null;
                          const todo = list.filter((part) => !partCollected(part));
                          return (
                            <div key={section} className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold tracking-wide text-sub uppercase">
                                  {SECTION_LABELS[section]} ({list.filter(partCollected).length}/{list.length})
                                </p>
                                {todo.length > 0 ? (
                                  <button
                                    type="button"
                                    className="text-xs font-medium text-brand hover:underline"
                                    onClick={() => todo.forEach((part) => stage(part.id, Boolean(part.collectedAt), true))}
                                  >
                                    Mark all collected
                                  </button>
                                ) : null}
                              </div>
                              <ul className="divide-y divide-line/70">
                                {list.map((part) => {
                                  const done = partCollected(part);
                                  const dirty = part.id in pending;
                                  return (
                                    <li key={part.id} className="flex items-start gap-2.5 py-1.5">
                                      <Checkbox
                                        className="mt-0.5"
                                        checked={done}
                                        onCheckedChange={(checked) => {
                                          const want = checked === true;
                                          toggle(part.name, Boolean(part.collectedAt), done, want, () =>
                                            stage(part.id, Boolean(part.collectedAt), want),
                                          );
                                        }}
                                        aria-label={`Mark ${part.name} collected`}
                                      />
                                      <div className="min-w-0 flex-1">
                                        <p className={cn("text-[13px] text-ink", done ? "text-sub" : "")}>
                                          {part.name}
                                          {part.quantity > 1 ? <span className="text-sub"> × {part.quantity}</span> : null}
                                          {part.starred ? (
                                            <span className="ml-1.5 rounded bg-card px-1.5 py-0.5 text-[11px] text-sub">given in class</span>
                                          ) : null}
                                        </p>
                                        <p className="text-xs text-sub">
                                          {[part.subject, part.publisher, part.detail].filter(Boolean).join(" · ")}
                                        </p>
                                      </div>
                                      <span
                                        className={cn(
                                          "shrink-0 text-xs",
                                          dirty ? "font-medium text-section-programs" : done ? "text-section-essentials" : "text-sub",
                                        )}
                                      >
                                        {dirty
                                          ? done
                                            ? "Will mark collected"
                                            : "Will mark not collected"
                                          : done
                                            ? "Collected"
                                            : "Not collected"}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {changedCount > 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-muted/50 p-3">
          <span className="text-sm text-sub">
            {changedCount} pending change{changedCount === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" disabled={isSaving} onClick={() => setPending({})}>
              Discard
            </Button>
            <Button
              size="sm"
              disabled={isSaving}
              onClick={() => {
                onSave(pending);
              }}
            >
              Save changes
            </Button>
          </div>
        </div>
      ) : null}

      <AlertDialog open={uncollectTarget !== null} onOpenChange={(open) => !open && setUncollectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark &quot;{uncollectTarget?.label}&quot; as not collected?</AlertDialogTitle>
            <AlertDialogDescription>
              Use this only to correct a mistake (e.g. it was marked collected but the parent never actually picked it
              up). This won&apos;t take effect until you click &quot;Save changes&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                uncollectTarget?.apply();
                setUncollectTarget(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
