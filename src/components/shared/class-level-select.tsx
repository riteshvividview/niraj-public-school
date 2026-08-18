"use client";

import { Loader2, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClassLevel } from "@/lib/data-source";
import type { ClassLevel } from "@/types";

const ADD_NEW_VALUE = "__add_new_class__";

/** Best-effort sort key so a newly typed "Class 4" lands between "Class 2" and "Class 8" instead of always at the end. */
function inferOrder(label: string, existing: ClassLevel[]): number {
  const match = label.match(/\d+/);
  if (match) return Number(match[0]);
  return existing.length > 0 ? Math.max(...existing.map((l) => l.order)) + 1 : 1;
}

/**
 * Class picker used everywhere a student/book/program needs a class level —
 * includes an "Add new class" option so staff aren't limited to whatever
 * classes happen to already exist (e.g. only Class 2 and Class 8 seeded,
 * but a new Class 4 student needs to be added).
 */
export function ClassLevelSelect({
  schoolId,
  classLevels,
  value,
  onChange,
  onClassLevelsChange,
  placeholder = "Select class",
}: {
  schoolId: string;
  classLevels: ClassLevel[];
  value: string;
  onChange: (id: string) => void;
  onClassLevelsChange: (levels: ClassLevel[]) => void;
  placeholder?: string;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [board, setBoard] = useState(classLevels[0]?.board ?? "CBSE");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!label.trim() || !board.trim()) return;
    setIsSubmitting(true);
    try {
      const created = await createClassLevel({
        schoolId,
        label: label.trim(),
        board: board.trim(),
        order: inferOrder(label.trim(), classLevels),
      });
      onClassLevelsChange([...classLevels, created].sort((a, b) => a.order - b.order));
      onChange(created.id);
      toast.success(`${created.label} added`);
      setCreateOpen(false);
      setLabel("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add this class");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v === ADD_NEW_VALUE) {
            setCreateOpen(true);
            return;
          }
          onChange(v);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {classLevels.map((level) => (
            <SelectItem key={level.id} value={level.id}>
              {level.label}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={ADD_NEW_VALUE}>
            <span className="flex items-center gap-1.5 text-brand">
              <Plus className="size-3.5" />
              Add new class
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Class</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="space-y-2">
              <Label htmlFor="new-class-label">Class name</Label>
              <Input
                id="new-class-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Class 4"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-class-board">Board</Label>
              <Input
                id="new-class-board"
                value={board}
                onChange={(e) => setBoard(e.target.value)}
                placeholder="e.g. CBSE"
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                Add Class
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
