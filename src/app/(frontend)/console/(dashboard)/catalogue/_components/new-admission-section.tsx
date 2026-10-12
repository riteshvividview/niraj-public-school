"use client";

import { ChevronDown, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { TableSkeletonRows } from "@/components/shared/table-skeleton-rows";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createUniformItem,
  getAcademicYearStartMonth,
  getNewAdmissionItems,
  getNewAdmissionSummary,
  setAcademicYearStartMonth,
  updateUniformItem,
} from "@/lib/data-source";
import { useClassLevels } from "@/lib/hooks/console-data";
import type { ClassLevel, Gender, UniformItem, UniformSizeOption } from "@/types";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ANY = "__any__";

function rangeLabel(item: UniformItem, classLevels: ClassLevel[]): string {
  const from = item.newAdmissionFromOrder;
  const to = item.newAdmissionToOrder;
  if (from == null && to == null) return "All classes";
  const sorted = [...classLevels].sort((a, b) => a.order - b.order);
  const first = from == null ? sorted[0] : sorted.find((c) => c.order >= from);
  const last = to == null ? sorted[sorted.length - 1] : [...sorted].reverse().find((c) => c.order <= to);
  return `${first?.label ?? "…"} to ${last?.label ?? "…"}`;
}

/**
 * Catalogue Manager → New Admission uniform. These items are common to every class: a NEW student
 * (register number starting with the current academic year's digits, or marked new by staff) must buy
 * them as part of their full uniform set; existing students may still buy them as optional extras.
 * Class lists above hold the regular items; the full set = a class's regular items + these.
 */
export function NewAdmissionSection({ schoolId }: { schoolId: string }) {
  const { classLevels } = useClassLevels(schoolId);
  const { data: summary, mutate: refreshSummary } = useSWR(schoolId ? ["console:new-admission-summary", schoolId] : null, () => getNewAdmissionSummary(schoolId));
  const { data: items, mutate: refreshItems } = useSWR(schoolId ? ["console:new-admission-items", schoolId] : null, () => getNewAdmissionItems(schoolId));
  const { data: savedMonth, mutate: refreshMonth } = useSWR(schoolId ? ["console:academic-year-month", schoolId] : null, () => getAcademicYearStartMonth(schoolId));
  const [monthDraft, setMonthDraft] = useState<string | null>(null);
  const [savingMonth, setSavingMonth] = useState(false);
  const [dialog, setDialog] = useState<{ editing: UniformItem | null } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<UniformItem | null>(null);
  const [showWaiting, setShowWaiting] = useState(false);

  const month = monthDraft ?? String(savedMonth ?? 4);
  const classLabelById = new Map(classLevels.map((c) => [c.id, c.label]));

  async function saveMonth() {
    setSavingMonth(true);
    try {
      const stored = await setAcademicYearStartMonth(schoolId, Number(month));
      await refreshMonth(stored, { revalidate: false });
      setMonthDraft(null);
      await refreshSummary();
      toast.success("Academic year start saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSavingMonth(false);
    }
  }

  async function remove() {
    if (!removeTarget) return;
    // Never deleted: past orders and exchanges still point at the item. It just leaves every list.
    await updateUniformItem(removeTarget.id, { retired: true });
    setRemoveTarget(null);
    toast.success("Removed from the new-admission list");
    await refreshItems();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4" />
            New Admission Uniform
          </CardTitle>
          <p className="mt-1 max-w-2xl text-sm text-sub">
            Items common to every class. A student whose register number starts with the current academic year (like{" "}
            <strong className="text-ink">{summary ? String(Number(summary.academicYear.slice(0, 4)) % 100).padStart(2, "0") : "26"}NPS…</strong>) is a{" "}
            <strong className="text-ink">new admission</strong> and must buy these with the rest of their class uniform, once. Existing students can still buy them as optional items.
          </p>
        </div>
        <Button size="sm" onClick={() => setDialog({ editing: null })}>
          <Plus className="size-4" /> Add Item
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-line p-3">
            <p className="text-xs text-sub">Academic year now</p>
            <p className="font-heading text-xl font-bold text-ink">{summary?.academicYear ?? "…"}</p>
            <div className="mt-2 flex items-center gap-2">
              <Select value={month} onValueChange={(v) => setMonthDraft(v)}>
                <SelectTrigger className="h-8 w-full text-xs" aria-label="Academic year starts in">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((name, index) => (
                    <SelectItem key={name} value={String(index + 1)}>
                      Starts in {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {monthDraft !== null && Number(monthDraft) !== (savedMonth ?? 4) ? (
                <Button size="sm" className="h-8" disabled={savingMonth} onClick={saveMonth}>
                  {savingMonth ? <Loader2 className="size-4 animate-spin" /> : "Save"}
                </Button>
              ) : null}
            </div>
          </div>
          <div className="rounded-lg border border-line p-3">
            <p className="text-xs text-sub">New students this year</p>
            <p className="font-heading text-xl font-bold text-ink">{summary?.newCount ?? "…"}</p>
            <p className="text-xs text-sub">of {summary?.totalStudents ?? "…"} students{summary && summary.overrides > 0 ? ` · ${summary.overrides} set by staff` : ""}</p>
          </div>
          <div className="rounded-lg border border-line p-3">
            <p className="text-xs text-sub">Bought the full set</p>
            <p className="font-heading text-xl font-bold text-section-essentials">{summary?.setBoughtCount ?? "…"}</p>
          </div>
          <div className="rounded-lg border border-line p-3">
            <p className="text-xs text-sub">Still to buy it</p>
            <p className="font-heading text-xl font-bold text-section-programs">{summary ? summary.newCount - summary.setBoughtCount : "…"}</p>
            {summary && summary.waiting.length > 0 ? (
              <button type="button" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline" onClick={() => setShowWaiting((v) => !v)}>
                {showWaiting ? "Hide" : "Show"} who <ChevronDown className={`size-3.5 transition-transform ${showWaiting ? "rotate-180" : ""}`} />
              </button>
            ) : null}
          </div>
        </div>

        {showWaiting && summary ? (
          <ul className="max-h-56 divide-y divide-line overflow-y-auto rounded-lg border border-line text-sm">
            {summary.waiting.map((student) => (
              <li key={student.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-ink">{student.name}</span>
                <span className="text-xs text-sub">
                  {student.registerNumber} · {classLabelById.get(student.classLevelId) ?? ""}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>For</TableHead>
                <TableHead>Classes</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items === undefined ? <TableSkeletonRows columns={6} /> : null}
              {(items ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="capitalize">{item.category}</TableCell>
                  <TableCell className="capitalize">{item.gender ? (item.gender === "female" ? "Girls" : "Boys") : "Everyone"}</TableCell>
                  <TableCell>{rangeLabel(item, classLevels)}</TableCell>
                  <TableCell>{item.sizeOptions.map((o) => (item.sizeOptions.length > 1 ? `${o.size}: ₹${o.price}` : `₹${o.price}`)).join(", ")}</TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setDialog({ editing: item })}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setRemoveTarget(item)}>
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items && items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sub">
                    No new-admission items yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {dialog ? (
        <ItemDialog
          key={dialog.editing?.id ?? "new"}
          schoolId={schoolId}
          classLevels={classLevels}
          editing={dialog.editing}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            void refreshItems();
          }}
        />
      ) : null}
      <ConfirmDeleteDialog
        open={removeTarget !== null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove this item?"
        description={`"${removeTarget?.name}" will leave the new-admission list and no longer be offered. Past orders that include it are kept.`}
        confirmLabel="Remove"
        onConfirm={remove}
      />
    </Card>
  );
}

function ItemDialog({
  schoolId,
  classLevels,
  editing,
  onClose,
  onSaved,
}: {
  schoolId: string;
  classLevels: ClassLevel[];
  editing: UniformItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const sorted = [...classLevels].sort((a, b) => a.order - b.order);
  const [name, setName] = useState(editing?.name ?? "");
  const [category, setCategory] = useState<"uniform" | "kit">(editing?.category ?? "kit");
  const [gender, setGender] = useState<Gender | typeof ANY>(editing?.gender ?? ANY);
  const [fromOrder, setFromOrder] = useState<string>(editing?.newAdmissionFromOrder != null ? String(editing.newAdmissionFromOrder) : ANY);
  const [toOrder, setToOrder] = useState<string>(editing?.newAdmissionToOrder != null ? String(editing.newAdmissionToOrder) : ANY);
  const [sizes, setSizes] = useState<UniformSizeOption[]>(editing?.sizeOptions ?? [{ size: "Standard", price: 0 }]);
  const [saving, setSaving] = useState(false);

  const valid = name.trim() !== "" && sizes.length > 0 && sizes.every((s) => s.size.trim() !== "" && s.price > 0);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      const from = fromOrder === ANY ? null : Number(fromOrder);
      const to = toOrder === ANY ? null : Number(toOrder);
      if (from != null && to != null && from > to) {
        toast.error("The first class must come before the last class.");
        return;
      }
      if (editing) {
        await updateUniformItem(editing.id, {
          name: name.trim(),
          category,
          gender: gender === ANY ? null : gender,
          sizeOptions: sizes.map((s) => ({ size: s.size.trim(), price: s.price })),
          newAdmissionFromOrder: from,
          newAdmissionToOrder: to,
        });
      } else {
        await createUniformItem({
          schoolId,
          newAdmission: true,
          name: name.trim(),
          category,
          gender: gender === ANY ? undefined : gender,
          sizeOptions: sizes.map((s) => ({ size: s.size.trim(), price: s.price })),
          newAdmissionFromOrder: from,
          newAdmissionToOrder: to,
        });
      }
      toast.success(editing ? "Item updated" : "Item added");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the item.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit new-admission item" : "Add new-admission item"}</DialogTitle>
          <DialogDescription>Required for new students (with their class uniform); optional for everyone else. Price is for the whole item as sold — e.g. a set of 2 at the set price.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="na-name">Name</Label>
            <Input id="na-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. NIR Uni FS Puff Hoody - Camo" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as "uniform" | "kit")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uniform">Uniform</SelectItem>
                  <SelectItem value="kit">Kit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>For</Label>
              <Select value={gender} onValueChange={(v) => setGender(v as Gender | typeof ANY)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Everyone</SelectItem>
                  <SelectItem value="female">Girls only</SelectItem>
                  <SelectItem value="male">Boys only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>From class</Label>
              <Select value={fromOrder} onValueChange={setFromOrder}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>First class</SelectItem>
                  {sorted.map((c) => (
                    <SelectItem key={c.id} value={String(c.order)}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>To class</Label>
              <Select value={toOrder} onValueChange={setToOrder}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Last class</SelectItem>
                  {sorted.map((c) => (
                    <SelectItem key={c.id} value={String(c.order)}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Sizes &amp; prices</Label>
            {sizes.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input className="flex-1" value={row.size} onChange={(e) => setSizes((prev) => prev.map((r, i) => (i === index ? { ...r, size: e.target.value } : r)))} placeholder="Size (e.g. Standard)" />
                <Input
                  className="w-28"
                  type="number"
                  min={1}
                  value={row.price || ""}
                  onChange={(e) => setSizes((prev) => prev.map((r, i) => (i === index ? { ...r, price: Number(e.target.value) } : r)))}
                  placeholder="₹"
                />
                <Button type="button" variant="ghost" size="icon" disabled={sizes.length === 1} onClick={() => setSizes((prev) => prev.filter((_, i) => i !== index))} aria-label="Remove size">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => setSizes((prev) => [...prev, { size: "", price: 0 }])}>
              <Plus className="size-4" /> Add size
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
