import * as XLSX from "xlsx";
import type { AcademicLanguage, Elective, LanguageLevel, Stream } from "@/types";

/**
 * One row parsed out of an uploaded file, before it's matched against real
 * class levels or given defaults — see students/page.tsx for that step.
 * Column names are matched case-insensitively and loosely (a school's own
 * export might call it "Register Number", "RegNo", "Roll No", etc.).
 *
 * `academicLanguage` is the raw cell text (e.g. "I Lang Hindi") — parsed
 * into `languageLevel`/`language` by parseLanguageCell below, not here,
 * since findValue only knows how to extract a column's text, not interpret
 * it. `stream`/`elective` are likewise raw cell text, normalized by
 * parseStream/parseElective.
 */
export interface ParsedStudentRow {
  name: string;
  registerNumber: string;
  className?: string;
  password?: string;
  mobileNumber?: string;
  section?: string;
  academicLanguage?: string;
  stream?: string;
  elective?: string;
}

const COLUMN_ALIASES: Record<keyof ParsedStudentRow, string[]> = {
  name: ["name", "studentname", "student name", "fullname", "full name"],
  registerNumber: [
    "registernumber",
    "register number",
    "regno",
    "reg no",
    "registerno",
    "register no",
    "rollnumber",
    "roll number",
    "rollno",
    "roll no",
    "id",
    "studentid",
    "student id",
    "enrollmentcode",
    "enrollment code",
  ],
  className: ["class", "classname", "class name", "grade", "classlevel", "class level"],
  password: ["password", "pass", "pin"],
  mobileNumber: ["mobile", "mobilenumber", "mobile number", "phone", "phonenumber", "phone number"],
  section: ["section"],
  academicLanguage: ["ii language", "i language", "language", "first language", "second language"],
  stream: ["optional 1", "stream", "group"],
  elective: ["optional 2", "elective"],
};

/** Canonical display header per field — also what the sample file's own headers use, so a downloaded sample always parses cleanly. */
export const SAMPLE_HEADERS: Record<keyof ParsedStudentRow, string> = {
  name: "Name",
  registerNumber: "Register Number",
  className: "Class",
  section: "Section",
  academicLanguage: "II Language",
  stream: "Optional 1",
  elective: "Optional 2",
  password: "Password",
  mobileNumber: "Mobile Number",
};

/** Shown in the Bulk Upload dialog's column guidance — kept as a `keyof ParsedStudentRow` list so it can't drift from the fields the parser actually reads. */
export const REQUIRED_FIELDS: (keyof ParsedStudentRow)[] = ["name", "registerNumber", "className"];
export const OPTIONAL_FIELDS: (keyof ParsedStudentRow)[] = [
  "section",
  "academicLanguage",
  "stream",
  "elective",
  "password",
  "mobileNumber",
];

/**
 * Downloads a small .xlsx staff can fill in and re-upload — real header
 * names (matching SAMPLE_HEADERS) plus a couple of example rows shaped like
 * the real rosters this app has already imported (a lower-grade row with
 * just the required columns + language, a higher-grade row also using
 * section/stream/elective).
 */
export function downloadSampleWorkbook(): void {
  const headers = [
    SAMPLE_HEADERS.name,
    SAMPLE_HEADERS.registerNumber,
    SAMPLE_HEADERS.className,
    SAMPLE_HEADERS.section,
    SAMPLE_HEADERS.academicLanguage,
    SAMPLE_HEADERS.stream,
    SAMPLE_HEADERS.elective,
    SAMPLE_HEADERS.password,
    SAMPLE_HEADERS.mobileNumber,
  ];
  const rows = [
    headers,
    ["AADVIKA GURALLA", "26NPS0018", "Class 2", "B", "I Lang Hindi", "", "", "", ""],
    ["ABHAY PHANIKIRAN YERI", "25NPS0084", "Class 8", "A", "II Lang Hindi", "Science", "ENA", "", "9876543210"],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Students");
  XLSX.writeFile(workbook, "student-import-sample.xlsx");
}

/** Parses roster cells like "I Lang Hindi" / "II Lang Telugu" into (level, language). */
export function parseLanguageCell(
  raw: string | undefined,
): { languageLevel?: LanguageLevel; academicLanguage?: AcademicLanguage } {
  if (!raw) return {};
  const normalized = raw.trim().toLowerCase();
  const languageLevel: LanguageLevel | undefined = normalized.startsWith("ii")
    ? "second"
    : normalized.startsWith("i")
      ? "first"
      : undefined;
  const academicLanguage: AcademicLanguage | undefined = normalized.includes("hindi")
    ? "hindi"
    : normalized.includes("telugu")
      ? "telugu"
      : undefined;
  return { languageLevel, academicLanguage };
}

export function parseStream(raw: string | undefined): Stream | undefined {
  if (!raw) return undefined;
  const normalized = raw.trim().toLowerCase();
  if (normalized.includes("science")) return "science";
  if (normalized.includes("econom")) return "economics";
  return undefined;
}

export function parseElective(raw: string | undefined): Elective | undefined {
  if (!raw) return undefined;
  const normalized = raw.trim().toLowerCase();
  if (normalized.includes("robotic")) return "roboticsAI";
  if (normalized.includes("home science")) return "homeScience";
  if (normalized.includes("ena")) return "ena";
  return undefined;
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

function findValue(row: Record<string, unknown>, field: keyof ParsedStudentRow): string | undefined {
  const aliases = COLUMN_ALIASES[field];
  for (const [key, value] of Object.entries(row)) {
    if (aliases.includes(normalizeKey(key)) && value !== undefined && value !== null && value !== "") {
      return String(value).trim();
    }
  }
  return undefined;
}

function rowsToStudents(rows: Record<string, unknown>[]): ParsedStudentRow[] {
  return rows.map((row) => ({
    name: findValue(row, "name") ?? "",
    registerNumber: findValue(row, "registerNumber") ?? "",
    className: findValue(row, "className"),
    password: findValue(row, "password"),
    mobileNumber: findValue(row, "mobileNumber"),
    section: findValue(row, "section"),
    academicLanguage: findValue(row, "academicLanguage"),
    stream: findValue(row, "stream"),
    elective: findValue(row, "elective"),
  }));
}

/**
 * Parses CSV, XLSX, XLS, and ODS (all via the same SheetJS reader) or JSON
 * (an array of objects, or `{ students: [...] }`). Rejects with a
 * user-facing message on anything else, rather than throwing a raw parser
 * error.
 */
export async function parseStudentsFile(file: File): Promise<ParsedStudentRow[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "json") {
    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("That file isn't valid JSON.");
    }
    const list = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { students?: unknown }).students)
        ? (parsed as { students: unknown[] }).students
        : null;
    if (!list) {
      throw new Error("Expected a JSON array of students (or { \"students\": [...] }).");
    }
    return rowsToStudents(list as Record<string, unknown>[]);
  }

  const supported = ["csv", "xlsx", "xls", "ods"];
  if (!extension || !supported.includes(extension)) {
    throw new Error("Supported file types: CSV, Excel (.xlsx/.xls), ODS, or JSON.");
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("That file doesn't have any sheets.");
  }
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return rowsToStudents(rows);
}
