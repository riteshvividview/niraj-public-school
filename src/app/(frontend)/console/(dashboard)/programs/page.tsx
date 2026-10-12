"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { TableSkeletonRows } from "@/components/shared/table-skeleton-rows";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { StatusBadge, toBadgeStatus } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createProgram,
  deleteProgram,
  getPrograms,
  setProgramStatus,
  updateProgram,
} from "@/lib/data-source";
import { useClassLevels, useConsoleSchoolId } from "@/lib/hooks/console-data";
import type { Program } from "@/types";

const SUGGESTED_CATEGORIES = ["Workshop", "Sports", "Camp", "Annual Day", "Exhibition", "Extra Class"];

function ProgramForm({
  schoolId,
  editing,
  onDone,
}: {
  schoolId: string;
  editing: Program | null;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [category, setCategory] = useState(editing?.category ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [venue, setVenue] = useState(editing?.venue ?? "");
  const [date, setDate] = useState(editing?.date ?? "");
  const [fee, setFee] = useState(editing ? String(editing.fee) : "");
  const [seatsTotal, setSeatsTotal] = useState(
    editing?.seatsTotal !== undefined ? String(editing.seatsTotal) : "",
  );
  const [contactPhone, setContactPhone] = useState(editing?.contactPhone ?? "");
  const { classLevels } = useClassLevels(schoolId);
  const [eligibleClassLevelIds, setEligibleClassLevelIds] = useState<string[]>(
    editing?.eligibleClassLevelIds ?? [],
  );

  function toggleClassLevel(id: string) {
    setEligibleClassLevelIds((current) =>
      current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id],
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const feeNum = Number(fee);
    if (!title.trim() || !category.trim() || !date || !contactPhone.trim()) return;
    const seatsNum = seatsTotal ? Number(seatsTotal) : undefined;
    if (editing) {
      await updateProgram(editing.id, {
        title: title.trim(),
        category: category.trim(),
        description: description.trim(),
        venue: venue.trim() || undefined,
        date,
        fee: feeNum,
        contactPhone: contactPhone.trim(),
        eligibleClassLevelIds,
      });
      toast.success("Program updated");
    } else {
      await createProgram({
        schoolId,
        title: title.trim(),
        category: category.trim(),
        description: description.trim(),
        venue: venue.trim() || undefined,
        date,
        fee: feeNum,
        seatsTotal: seatsNum,
        contactPhone: contactPhone.trim(),
        eligibleClassLevelIds,
      });
      toast.success("Program created");
    }
    onDone();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="program-title">Title</Label>
        <Input
          id="program-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="program-category">Category</Label>
        <Input
          id="program-category"
          list="program-categories"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. Workshop, or type your own"
          required
        />
        <datalist id="program-categories">
          {SUGGESTED_CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div className="space-y-2">
        <Label htmlFor="program-description">Description</Label>
        <Textarea
          id="program-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="program-venue">Venue (optional)</Label>
          <Input
            id="program-venue"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="program-date">Date</Label>
          <Input
            id="program-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="program-fee">Fee (₹)</Label>
          <Input
            id="program-fee"
            type="number"
            min="0"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="program-seats">Total seats (optional)</Label>
          <Input
            id="program-seats"
            type="number"
            min="1"
            value={seatsTotal}
            disabled={Boolean(editing)}
            onChange={(e) => setSeatsTotal(e.target.value)}
            placeholder="Leave blank for unlimited"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="program-contact">Contact phone</Label>
        <Input
          id="program-contact"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Eligible grades</Label>
        <p className="text-xs text-sub">Leave all unchecked to open this to every grade.</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-line p-3">
          {classLevels.map((level) => (
            <label key={level.id} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={eligibleClassLevelIds.includes(level.id)}
                onChange={() => toggleClassLevel(level.id)}
                className="size-4 rounded border-input"
              />
              {level.label}
            </label>
          ))}
          {classLevels.length === 0 ? <p className="text-sm text-sub">No classes yet.</p> : null}
        </div>
      </div>
      {editing ? (
        <p className="text-xs text-sub">
          Seat count isn&apos;t editable here to avoid conflicting with live
          enrollments — use Close Registration to stop new sign-ups instead.
        </p>
      ) : null}
      <DialogFooter>
        <Button type="submit">
          {editing ? "Save Changes" : "Create Program"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function ProgramDialog({
  open,
  onOpenChange,
  schoolId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  editing: Program | null;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Program" : "Create Program"}
          </DialogTitle>
        </DialogHeader>
        {open ? (
          <ProgramForm
            key={editing?.id ?? "new"}
            schoolId={schoolId}
            editing={editing}
            onDone={() => {
              onOpenChange(false);
              onSaved();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default function ProgramManagerPage() {
  const schoolId = useConsoleSchoolId();
  const { data: programsData, mutate: refresh } = useSWR(
    schoolId ? ["console:programs", schoolId] : null,
    () => getPrograms({ schoolId }),
  );
  const programs = programsData ?? null;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Program | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteProgram(deleteTarget.id);
    setDeleteTarget(null);
    toast.success("Program deleted");
    refresh();
  }

  async function handleCloseRegistration(id: string) {
    await setProgramStatus(id, "closed");
    toast.success("Registration closed");
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">
            Program Manager
          </h1>
          <p className="text-sm text-sub">
            Create and publish programs & events for this school.
          </p>
        </div>
        <Button
          disabled={!schoolId}
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          Create Program
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Programs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs === null ? <TableSkeletonRows columns={6} /> : null}
                {(programs ?? []).map((program) => (
                  <TableRow key={program.id}>
                    <TableCell>{program.title}</TableCell>
                    <TableCell>{program.date}</TableCell>
                    <TableCell>
                      {program.seatsTotal !== undefined
                        ? `${program.seatsAvailable} / ${program.seatsTotal}`
                        : "Unlimited"}
                    </TableCell>
                    <TableCell>₹{program.fee}</TableCell>
                    <TableCell>
                      <StatusBadge status={toBadgeStatus(program.status)} />
                    </TableCell>
                    <TableCell className="space-x-1 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(program);
                          setDialogOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      {program.status !== "closed" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCloseRegistration(program.id)}
                        >
                          Close Registration
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(program)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {programs !== null && programs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sub">
                      No programs published yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ProgramDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schoolId={schoolId}
        editing={editing}
        onSaved={refresh}
      />
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this program?"
        description={`"${deleteTarget?.title}" will be permanently removed, including its enrollment data. This can't be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
