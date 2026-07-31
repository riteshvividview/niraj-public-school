"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  getSchools,
  setProgramStatus,
  updateProgram,
} from "@/lib/data-source";
import type { Program, ProgramCategory } from "@/types";

const CATEGORIES: ProgramCategory[] = [
  "workshop",
  "sports",
  "camp",
  "annual-day",
  "exhibition",
  "extra-class",
];

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
  const [category, setCategory] = useState<ProgramCategory>(editing?.category ?? "workshop");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [venue, setVenue] = useState(editing?.venue ?? "");
  const [date, setDate] = useState(editing?.date ?? "");
  const [fee, setFee] = useState(editing ? String(editing.fee) : "");
  const [seatsTotal, setSeatsTotal] = useState(editing ? String(editing.seatsTotal) : "");
  const [contactPhone, setContactPhone] = useState(editing?.contactPhone ?? "");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const feeNum = Number(fee);
    const seatsNum = Number(seatsTotal);
    if (!title.trim() || !venue.trim() || !date || !contactPhone.trim() || !seatsNum) return;
    if (editing) {
      await updateProgram(editing.id, {
        title: title.trim(),
        category,
        description: description.trim(),
        venue: venue.trim(),
        date,
        fee: feeNum,
        contactPhone: contactPhone.trim(),
      });
    } else {
      await createProgram({
        schoolId,
        title: title.trim(),
        category,
        description: description.trim(),
        venue: venue.trim(),
        date,
        fee: feeNum,
        seatsTotal: seatsNum,
        contactPhone: contactPhone.trim(),
      });
    }
    onDone();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="program-title">Title</Label>
        <Input id="program-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as ProgramCategory)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c
                  .split("-")
                  .map((w) => w[0].toUpperCase() + w.slice(1))
                  .join(" ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="program-venue">Venue</Label>
          <Input id="program-venue" value={venue} onChange={(e) => setVenue(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="program-date">Date</Label>
          <Input id="program-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
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
          <Label htmlFor="program-seats">Total seats</Label>
          <Input
            id="program-seats"
            type="number"
            min="1"
            value={seatsTotal}
            disabled={Boolean(editing)}
            onChange={(e) => setSeatsTotal(e.target.value)}
            required
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
      {editing ? (
        <p className="text-xs text-sub">
          Seat count isn&apos;t editable here to avoid conflicting with live
          enrollments — use Close Registration to stop new sign-ups instead.
        </p>
      ) : null}
      <DialogFooter>
        <Button type="submit">{editing ? "Save Changes" : "Create Program"}</Button>
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
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Program" : "Create Program"}</DialogTitle>
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
  const [schoolId, setSchoolId] = useState<string>("");
  const [programs, setPrograms] = useState<Program[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Program | null>(null);

  useEffect(() => {
    getSchools().then((schools) => {
      if (schools.length > 0) setSchoolId(schools[0].id);
    });
  }, []);

  const refresh = useCallback(() => {
    if (!schoolId) return;
    getPrograms({ schoolId }).then(setPrograms);
  }, [schoolId]);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this program? This can't be undone in this demo.")) return;
    await deleteProgram(id);
    refresh();
  }

  async function handleCloseRegistration(id: string) {
    await setProgramStatus(id, "closed");
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Program Manager</h1>
          <p className="text-sm text-sub">Create and publish programs & events for this school.</p>
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
              {(programs ?? []).map((program) => (
                <TableRow key={program.id}>
                  <TableCell>{program.title}</TableCell>
                  <TableCell>{program.date}</TableCell>
                  <TableCell>
                    {program.seatsAvailable} / {program.seatsTotal}
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
                      <Button variant="ghost" size="sm" onClick={() => handleCloseRegistration(program.id)}>
                        Close Registration
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(program.id)}>
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
        </CardContent>
      </Card>

      <ProgramDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schoolId={schoolId}
        editing={editing}
        onSaved={refresh}
      />
    </div>
  );
}
