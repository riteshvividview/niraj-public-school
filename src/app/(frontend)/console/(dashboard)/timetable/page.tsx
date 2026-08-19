"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { createTimetable, getTimetableByClassLevel, updateTimetable } from "@/lib/data-source";
import { useClassLevels, useConsoleSchoolId } from "@/lib/hooks/console-data";
import type { Timetable, TimetableNote, TimetablePeriod } from "@/types";

const DAY_COLUMNS: { key: keyof Omit<TimetablePeriod, "label">; label: string }[] = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
];

function emptyPeriod(): TimetablePeriod {
  return { label: "" };
}

function emptyNote(): TimetableNote {
  return { heading: "" };
}

export default function TimetableManagerPage() {
  const schoolId = useConsoleSchoolId();
  const { classLevels } = useClassLevels(schoolId);
  const [classLevelId, setClassLevelId] = useState("");
  const effectiveClassLevelId = classLevelId || classLevels[0]?.id || "";

  // revalidateOnFocus disabled here — the fetched timetable seeds locally
  // editable form state (periods/notes) below, and a background refetch on
  // tab focus would silently overwrite whatever the user is mid-editing.
  const { data: timetableData, mutate: mutateTimetable } = useSWR(
    schoolId && effectiveClassLevelId
      ? ["console:timetable", schoolId, effectiveClassLevelId]
      : null,
    () => getTimetableByClassLevel(schoolId, effectiveClassLevelId),
    { revalidateOnFocus: false },
  );
  // undefined = still loading this class's timetable; null = confirmed none exists yet.
  const existing = timetableData;
  const [periods, setPeriods] = useState<TimetablePeriod[]>([]);
  const [notes, setNotes] = useState<TimetableNote[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  // Seeds the editable periods/notes state from the fetched timetable once
  // per class switch — an in-render state adjustment (React's recommended
  // alternative to an effect for "reset state when a prop changes") so it
  // doesn't re-run and clobber in-progress edits on every SWR revalidation.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (timetableData !== undefined && seededFor !== effectiveClassLevelId) {
    setSeededFor(effectiveClassLevelId);
    setPeriods(timetableData?.periods ?? []);
    setNotes(timetableData?.notes ?? []);
    setSavedMessage(false);
  }

  function updatePeriodField(index: number, field: keyof TimetablePeriod, value: string) {
    setPeriods((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function updateNoteField(index: number, field: keyof TimetableNote, value: string) {
    setNotes((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  async function handleSave() {
    setIsSaving(true);
    setSavedMessage(false);
    const cleanPeriods = periods.filter((p) => p.label.trim());
    if (existing) {
      const updated = await updateTimetable(existing.id, { periods: cleanPeriods, notes });
      mutateTimetable(updated, { revalidate: false });
    } else {
      const created = await createTimetable({
        schoolId,
        classLevelId: effectiveClassLevelId,
        periods: cleanPeriods,
        notes,
      });
      mutateTimetable(created, { revalidate: false });
    }
    setPeriods(cleanPeriods);
    setIsSaving(false);
    setSavedMessage(true);
    toast.success("Timetable saved");
  }

  const selectedClassLabel = classLevels.find((level) => level.id === effectiveClassLevelId)?.label ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">Timetable Manager</h1>
        <p className="text-sm text-sub">
          Build each class&apos;s weekly schedule as a table — no image upload. Add any extra
          notes below the grid.
        </p>
      </div>

      <div className="max-w-xs space-y-2">
        <Label>Class</Label>
        <Select value={effectiveClassLevelId} onValueChange={setClassLevelId}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {classLevels.map((level) => (
              <SelectItem key={level.id} value={level.id}>
                {level.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {schoolId && effectiveClassLevelId && existing !== undefined ? (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Weekly Schedule — {selectedClassLabel}</CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setPeriods((rows) => [...rows, emptyPeriod()])}
              >
                <Plus className="size-4" />
                Add Period
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-32">Period</TableHead>
                      {DAY_COLUMNS.map((day) => (
                        <TableHead key={day.key} className="min-w-32">
                          {day.label}
                        </TableHead>
                      ))}
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periods.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={row.label}
                            placeholder="e.g. 9:00 – 9:45"
                            onChange={(e) => updatePeriodField(index, "label", e.target.value)}
                          />
                        </TableCell>
                        {DAY_COLUMNS.map((day) => (
                          <TableCell key={day.key}>
                            <Input
                              value={row[day.key] ?? ""}
                              onChange={(e) => updatePeriodField(index, day.key, e.target.value)}
                            />
                          </TableCell>
                        ))}
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Remove period"
                            onClick={() => setPeriods((rows) => rows.filter((_, i) => i !== index))}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {periods.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-sub">
                          No periods yet — add one to start building the schedule.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Notes</CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setNotes((rows) => [...rows, emptyNote()])}
              >
                <Plus className="size-4" />
                Add Note
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {notes.map((note, index) => (
                <div key={index} className="space-y-2 rounded-lg border border-line/60 p-4">
                  <div className="flex items-center gap-2">
                    <Input
                      value={note.heading}
                      placeholder="Heading, e.g. Sports uniform"
                      onChange={(e) => updateNoteField(index, "heading", e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Remove note"
                      onClick={() => setNotes((rows) => rows.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={note.body ?? ""}
                    placeholder="Details…"
                    onChange={(e) => updateNoteField(index, "body", e.target.value)}
                  />
                </div>
              ))}
              {notes.length === 0 ? <p className="text-sm text-sub">No notes yet.</p> : null}
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save Timetable
            </Button>
            {savedMessage ? <p className="text-sm text-section-essentials">Saved.</p> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
