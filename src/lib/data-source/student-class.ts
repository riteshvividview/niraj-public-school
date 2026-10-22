import type { ClassLevel } from "@/types";

/** Staff — promoting / moving students between classes. Goes through the server so every move is guarded and logged. */
export interface ClassChangeResult {
  direction: "promoted" | "demoted" | "changed";
  fromLabel: string;
  toLabel: string;
  moved: Array<{ id: string; name: string; registerNumber: string }>;
  skipped: Array<{ id: string; name: string; registerNumber: string; reason: string }>;
}

export async function changeStudentsClass(input: {
  studentIds: string[];
  fromClassLevelId: string;
  toClassLevelId: string;
  note?: string;
}): Promise<ClassChangeResult> {
  const res = await fetch("/api/students/class", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    body: JSON.stringify(input),
  });
  const body = (await res.json().catch(() => ({}))) as ClassChangeResult & { error?: string };
  if (!res.ok) throw new Error(body.error ?? "We couldn't move the students. Nothing was changed.");
  return body;
}

/** The class a student normally goes to next: the one whose order is exactly one higher. None after the last class (or for a special class). */
export function nextClassOf(current: ClassLevel | undefined, classLevels: ClassLevel[]): ClassLevel | undefined {
  if (!current) return undefined;
  return classLevels.find((level) => level.order === current.order + 1);
}
