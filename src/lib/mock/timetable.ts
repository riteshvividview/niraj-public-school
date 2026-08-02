import type { Timetable } from "@/types";
import { MOCK_SCHOOL } from "./school";

const SEED_TIMESTAMP = "2026-06-01T00:00:00.000Z";
const schoolId = MOCK_SCHOOL.id;

function timetable(id: string, classLevelId: string): Timetable {
  return {
    id,
    schoolId,
    classLevelId,
    periods: [
      { label: "9:00 – 9:45", monday: "English", tuesday: "Mathematics", wednesday: "Science", thursday: "English", friday: "Mathematics", saturday: "Art" },
      { label: "9:45 – 10:30", monday: "Mathematics", tuesday: "English", wednesday: "Social Studies", thursday: "Mathematics", friday: "Science", saturday: "Library" },
      { label: "10:30 – 10:45", monday: "Break", tuesday: "Break", wednesday: "Break", thursday: "Break", friday: "Break", saturday: "Break" },
      { label: "10:45 – 11:30", monday: "Science", tuesday: "Social Studies", wednesday: "English", thursday: "Computer Science", friday: "Social Studies", saturday: "Sports" },
      { label: "11:30 – 12:15", monday: "Social Studies", tuesday: "Computer Science", wednesday: "Mathematics", thursday: "Science", friday: "English", saturday: "Sports" },
    ],
    notes: [
      { heading: "Sports uniform", body: "Wear the PT kit on Saturdays." },
    ],
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  };
}

export const MOCK_TIMETABLES: Timetable[] = [
  timetable("timetable-class-1", "class-1"),
  timetable("timetable-class-3", "class-3"),
  timetable("timetable-class-6", "class-6"),
  timetable("timetable-class-9", "class-9"),
];
