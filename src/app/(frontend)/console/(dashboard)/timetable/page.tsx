"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import {
  createTimetable,
  getClassLevelsBySchool,
  getSchools,
  getTimetableByClassLevel,
  updateTimetable,
} from "@/lib/data-source";
import type { ClassLevel, Timetable, TimetableNote, TimetablePeriod } from "@/types";

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
  const [schoolId, setSchoolId] = useState("");
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [classLevelId, setClassLevelId] = useState("");

  // undefined = still loading this class's timetable; null = confirmed none exists yet.
  const [existing, setExisting] = useState<Timetable | null | undefined>(undefined);
  const [periods, setPeriods] = useState<TimetablePeriod[]>([]);
  const [notes, setNotes] = useState<TimetableNote[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    getSchools().then((schools) => {
      if (schools.length > 0) setSchoolId(schools[0].id);
    });
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    getClassLevelsBySchool(schoolId).then((result) => {
      setClassLevels(result);
      if (result.length > 0) setClassLevelId(result[0].id);
    });
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId || !classLevelId) return;
    getTimetableByClassLevel(schoolId, classLevelId).then((timetable) => {
      setExisting(timetable);
      setSavedMessage(false);
      setPeriods(timetable?.periods ?? []);
      setNotes(timetable?.notes ?? []);
    });
  }, [schoolId, classLevelId]);

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
      setExisting(updated);
    } else {
      const created = await createTimetable({ schoolId, classLevelId, periods: cleanPeriods, notes });
      setExisting(created);
    }
    setPeriods(cleanPeriods);
    setIsSaving(false);
    setSavedMessage(true);
  }

  const selectedClassLabel = classLevels.find((level) => level.id === classLevelId)?.label ?? "";

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
        <Select value={classLevelId} onValueChange={setClassLevelId}>
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

      {schoolId && classLevelId && existing !== undefined ? (
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
