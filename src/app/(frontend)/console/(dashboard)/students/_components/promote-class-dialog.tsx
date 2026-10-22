"use client";

import { ArrowRight, CheckCircle2, Loader2, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changeStudentsClass, getStudentsPageBySchool, nextClassOf, type ClassChangeResult } from "@/lib/data-source";
import { cn } from "@/lib/utils";
import type { ClassLevel } from "@/types";

const NO_SECTION = "(no section)";
const MAX_LIST = 500;

/**
 * Promote a whole class at once (end of the school year): pick the class, tick the sections / students who
 * are moving, pick where they go (the next standard by default) and confirm. Students who stay back are
 * simply left unticked — or moved back later from their own profile. Only the class changes; book sets and
 * uniform kits belong to the class and are not touched.
 */
export function PromoteClassDialog({
  open,
  onOpenChange,
  schoolId,
  classLevels,
  initialClassId,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  classLevels: ClassLevel[];
  /** The class currently filtered on the Students list, if any. */
  initialClassId?: string;
  onChanged: () => void;
}) {
  const [fromId, setFromId] = useState(initialClassId ?? "");
  const [toChoice, setToChoice] = useState("");
  const [unticked, setUnticked] = useState<Set<string>>(new Set());
  const [sectionsOff, setSectionsOff] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<"choose" | "confirm" | "done">("choose");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClassChangeResult | null>(null);
  const [undone, setUndone] = useState(false);

  const ordered = [...classLevels].sort((a, b) => a.order - b.order);
  const fromClass = ordered.find((level) => level.id === fromId);
  const nextClass = nextClassOf(fromClass, ordered);
  const toId = toChoice || nextClass?.id || "";
  const toClass = ordered.find((level) => level.id === toId);

  const { data, isLoading } = useSWR(
    open && fromId ? ["console:promote-students", schoolId, fromId] : null,
    () => getStudentsPageBySchool(schoolId, { classLevelId: fromId }, 1, MAX_LIST),
  );
  const students = data?.students ?? [];
  const sectionOf = (section?: string) => section?.trim() || NO_SECTION;
  const sections = [...students.reduce((map, student) => map.set(sectionOf(student.section), (map.get(sectionOf(student.section)) ?? 0) + 1), new Map<string, number>())].sort(([a], [b]) => a.localeCompare(b));
  const isSelected = (id: string, section?: string) => !unticked.has(id) && !sectionsOff.has(sectionOf(section));
  const chosen = students.filter((student) => isSelected(student.id, student.section));

  function pickFrom(id: string) {
    setFromId(id);
    setToChoice("");
    setUnticked(new Set());
    setSectionsOff(new Set());
    setError(null);
  }
  function toggleSection(section: string) {
    setSectionsOff((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }
  function toggleStudent(id: string) {
    setUnticked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function reset() {
    setStep("choose");
    setResult(null);
    setUndone(false);
    setError(null);
    setUnticked(new Set());
    setSectionsOff(new Set());
    setToChoice("");
  }

  async function confirmMove() {
    if (!fromClass || !toClass) return;
    setBusy(true);
    setError(null);
    try {
      const moved = await changeStudentsClass({ studentIds: chosen.map((student) => student.id), fromClassLevelId: fromClass.id, toClassLevelId: toClass.id });
      setResult(moved);
      setStep("done");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't move the students. Nothing was changed.");
      setStep("choose");
    } finally {
      setBusy(false);
    }
  }

  async function undoMove() {
    if (!result || !fromClass || !toClass) return;
    setBusy(true);
    try {
      await changeStudentsClass({
        studentIds: result.moved.map((student) => student.id),
        fromClassLevelId: toClass.id,
        toClassLevelId: fromClass.id,
        note: "Undo of the move just made",
      });
      setUndone(true);
      toast.success(`Moved ${result.moved.length} students back to ${fromClass.label}.`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't undo the move.");
    } finally {
      setBusy(false);
    }
  }

  function close(next: boolean) {
    onOpenChange(next);
    if (!next) reset();
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Promote a class</DialogTitle>
          <DialogDescription>
            Move a class to the next standard in one go. Only the students&apos; class changes — book sets and uniform kits stay exactly as they are.
          </DialogDescription>
        </DialogHeader>

        {step === "choose" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <div className="space-y-1.5">
                <Label>Promote students of</Label>
                <Select value={fromId || undefined} onValueChange={pickFrom}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {ordered.map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ArrowRight className="mx-auto hidden size-5 text-sub sm:block sm:mb-2.5" />
              <div className="space-y-1.5">
                <Label>Promote to</Label>
                <Select value={toId || undefined} onValueChange={setToChoice} disabled={!fromClass}>
                  <SelectTrigger>
                    <SelectValue placeholder={fromClass ? "No next class — choose one" : "Choose a class first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {ordered
                      .filter((level) => level.id !== fromId)
                      .map((level) => (
                        <SelectItem key={level.id} value={level.id}>
                          {level.label}
                          {level.id === nextClass?.id ? " (next standard)" : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {fromClass && !nextClass && !toChoice ? (
              <p className="rounded-lg border border-section-programs/30 bg-section-programs-bg p-3 text-sm text-section-programs">
                {fromClass.label} has no next standard in the system, so choose where these students go.
              </p>
            ) : null}

            {fromClass ? (
              isLoading ? (
                <p className="flex items-center gap-2 text-sm text-sub">
                  <Loader2 className="size-4 animate-spin" />
                  Loading {fromClass.label}…
                </p>
              ) : students.length === 0 ? (
                <p className="rounded-xl border border-line/60 py-8 text-center text-sm text-sub">There are no students in {fromClass.label}.</p>
              ) : (
                <div className="space-y-3">
                  {sections.length > 1 ? (
                    <div className="space-y-1.5">
                      <Label>Sections moving up</Label>
                      <div className="flex flex-wrap gap-2">
                        {sections.map(([section, count]) => {
                          const on = !sectionsOff.has(section);
                          return (
                            <button
                              key={section}
                              type="button"
                              onClick={() => toggleSection(section)}
                              className={cn(
                                "cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors",
                                on ? "border-brand bg-brand/10 font-medium text-brand" : "border-line text-sub hover:text-ink",
                              )}
                            >
                              {section === NO_SECTION ? section : `Section ${section}`} · {count}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between gap-2">
                    <Label>
                      Students ({chosen.length} of {students.length} moving)
                    </Label>
                    <div className="flex gap-2 text-xs">
                      <button type="button" className="cursor-pointer text-brand hover:underline" onClick={() => { setUnticked(new Set()); setSectionsOff(new Set()); }}>
                        Tick all
                      </button>
                      <button type="button" className="cursor-pointer text-brand hover:underline" onClick={() => setUnticked(new Set(students.map((s) => s.id)))}>
                        Untick all
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-sub">Untick a student who is staying in {fromClass.label} (they will not be moved).</p>
                  <div className="max-h-72 divide-y divide-line overflow-y-auto rounded-lg border border-line">
                    {students.map((student) => {
                      const selected = isSelected(student.id, student.section);
                      return (
                        <label key={student.id} className={cn("flex cursor-pointer items-center gap-3 px-3 py-2 text-sm", !selected && "bg-muted/40 text-sub")}>
                          <Checkbox
                            checked={selected}
                            disabled={sectionsOff.has(sectionOf(student.section))}
                            onCheckedChange={() => toggleStudent(student.id)}
                          />
                          <span className="min-w-0 flex-1 truncate">{student.name}</span>
                          <span className="shrink-0 text-xs text-sub">
                            {student.registerNumber}
                            {student.section ? ` · ${student.section}` : ""}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button disabled={!fromClass || !toClass || chosen.length === 0} onClick={() => setStep("confirm")}>
                Review
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {step === "confirm" && fromClass && toClass ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-line p-4">
              <p className="text-sm text-sub">You are about to move</p>
              <p className="mt-1 font-heading text-lg font-semibold text-ink">
                {chosen.length} {chosen.length === 1 ? "student" : "students"}: {fromClass.label} <ArrowRight className="mx-1 inline size-4" /> {toClass.label}
              </p>
              {students.length - chosen.length > 0 ? (
                <p className="mt-2 text-sm text-sub">
                  {students.length - chosen.length} {students.length - chosen.length === 1 ? "student stays" : "students stay"} in {fromClass.label}.
                </p>
              ) : null}
              <p className="mt-2 text-sm text-sub">
                Every move is saved in the activity log. You can undo this straight after, and move any single student back later from their profile.
              </p>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button variant="outline" disabled={busy} onClick={() => setStep("choose")}>
                Back
              </Button>
              <Button disabled={busy} onClick={confirmMove}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Yes, move {chosen.length} {chosen.length === 1 ? "student" : "students"}
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {step === "done" && result && fromClass && toClass ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-section-essentials/30 bg-section-essentials-bg p-4 text-section-essentials">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-medium">
                  {undone
                    ? `Undone — ${result.moved.length} students are back in ${result.fromLabel}.`
                    : `${result.moved.length} ${result.moved.length === 1 ? "student" : "students"} moved from ${result.fromLabel} to ${result.toLabel}.`}
                </p>
              </div>
            </div>
            {result.skipped.length > 0 ? (
              <div className="space-y-1.5 rounded-lg border border-section-programs/30 bg-section-programs-bg p-4 text-sm text-section-programs">
                <p className="font-medium">{result.skipped.length} could not be moved:</p>
                <ul className="list-disc space-y-0.5 pl-5">
                  {result.skipped.map((student) => (
                    <li key={student.id}>
                      {student.name} ({student.registerNumber}) — {student.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <DialogFooter>
              {!undone && result.moved.length > 0 ? (
                <Button variant="outline" disabled={busy} onClick={undoMove}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Undo2 className="size-4" />}
                  Undo this move
                </Button>
              ) : null}
              <Button onClick={() => close(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

