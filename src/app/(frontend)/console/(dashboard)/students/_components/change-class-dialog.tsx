"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changeStudentsClass, nextClassOf } from "@/lib/data-source";
import type { ClassLevel, RecordEvent, UserProfile } from "@/types";

/**
 * Move ONE student to another class from their profile — promote them, or keep them in the year they were
 * in (move them back) when they didn't pass. The class they were in before the last move is offered as a
 * one-click "move back". Only the class changes; book sets and uniform kits belong to the class.
 */
export function ChangeClassDialog({
  open,
  onOpenChange,
  student,
  classLevels,
  history,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: UserProfile;
  classLevels: ClassLevel[];
  /** The student's activity log (newest first), used to find the class they were in before. */
  history: RecordEvent[];
  onChanged: () => void;
}) {
  const ordered = [...classLevels].sort((a, b) => a.order - b.order);
  const current = ordered.find((level) => level.id === student.classLevelId);
  const next = nextClassOf(current, ordered);

  // The class the student was in before their most recent class move, if that move is what put them here.
  const lastMove = history.find((event) => event.eventType.startsWith("class.") && event.details?.toClassLevelId === student.classLevelId);
  const previousId = typeof lastMove?.details?.fromClassLevelId === "string" ? lastMove.details.fromClassLevelId : "";
  const previous = ordered.find((level) => level.id === previousId);

  const [toId, setToId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const target = ordered.find((level) => level.id === toId);
  const verb = !target || !current ? "Move" : target.order > current.order ? "Promote" : target.order < current.order ? "Move back" : "Move";

  async function move() {
    if (!current || !target) return;
    setBusy(true);
    try {
      const result = await changeStudentsClass({ studentIds: [student.id], fromClassLevelId: current.id, toClassLevelId: target.id, note: note.trim() || undefined });
      if (result.moved.length === 0) {
        toast.error(result.skipped[0]?.reason ?? "The student could not be moved.");
        return;
      }
      toast.success(`${student.name} moved from ${result.fromLabel} to ${result.toLabel}.`, {
        duration: 10000,
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await changeStudentsClass({ studentIds: [student.id], fromClassLevelId: target.id, toClassLevelId: current.id, note: "Undo of the move just made" });
              toast.success(`${student.name} is back in ${current.label}.`);
              onChanged();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Couldn't undo the move.");
            }
          },
        },
      });
      onChanged();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We couldn't move the student. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change class</DialogTitle>
          <DialogDescription>
            {student.name} is in <strong>{current?.label ?? "—"}</strong>. Only their class changes — book sets and uniform kits stay as they are.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {next ? (
              <Button type="button" size="sm" variant={toId === next.id ? "default" : "outline"} onClick={() => setToId(next.id)}>
                Promote to {next.label}
              </Button>
            ) : null}
            {previous ? (
              <Button type="button" size="sm" variant={toId === previous.id ? "default" : "outline"} onClick={() => setToId(previous.id)}>
                Move back to {previous.label}
              </Button>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label>Move to</Label>
            <Select value={toId || undefined} onValueChange={setToId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a class" />
              </SelectTrigger>
              <SelectContent>
                {ordered
                  .filter((level) => level.id !== student.classLevelId)
                  .map((level) => (
                    <SelectItem key={level.id} value={level.id}>
                      {level.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="class-note">Note (optional)</Label>
            <Input id="class-note" value={note} maxLength={300} placeholder="e.g. Did not pass — repeating the year" onChange={(event) => setNote(event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!target || busy} onClick={move}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {target ? (
              <>
                {verb} to {target.label}
                <ArrowRight className="size-4" />
              </>
            ) : (
              "Move"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
