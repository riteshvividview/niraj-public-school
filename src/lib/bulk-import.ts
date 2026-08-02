import * as XLSX from "xlsx";

/**
 * One row parsed out of an uploaded file, before it's matched against real
 * class levels or given defaults — see students/page.tsx for that step.
 * Column names are matched case-insensitively and loosely (a school's own
 * export might call it "Register Number", "RegNo", "Roll No", etc.).
 */
export interface ParsedStudentRow {
  name: string;
  registerNumber: string;
  className?: string;
  password?: string;
  mobileNumber?: string;
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
  ],
  className: ["class", "classname", "class name", "grade", "classlevel", "class level"],
  password: ["password", "pass", "pin"],
  mobileNumber: ["mobile", "mobilenumber", "mobile number", "phone", "phonenumber", "phone number"],
};

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
