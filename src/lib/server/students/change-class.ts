import { randomUUID } from "node:crypto";
import type { Payload } from "payload";
import { recordEvent, type RecordEventInput } from "@/lib/server/record-events";

/**
 * Server-only. Moves students from one class to another — promotion at the end of the year, or a
 * demotion for a student who stays back. This changes ONLY the student's class: book sets and uniform
 * kits belong to the class, so the student simply sees the new class's list from then on; their language,
 * stream, elective and section stay as they are (staff change those on the student's profile).
 *
 * Safety:
 *  - the move is ONE database statement that only touches students who are still in the class the
 *    caller believes they are in (`fromClassLevelId`) — a stale screen, a double click or two staff
 *    working at once can never push a student somewhere unintended;
 *  - a student with a payment in progress is skipped (their cart and payment are for the old class);
 *  - every student moved gets a line in the permanent activity log (who, from, to, when).
 */
interface Queryable {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
}

export class ClassChangeError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export type ClassChangeDirection = "promoted" | "demoted" | "changed";

export interface ClassChangeResult {
  direction: ClassChangeDirection;
  fromLabel: string;
  toLabel: string;
  moved: Array<{ id: string; name: string; registerNumber: string }>;
  skipped: Array<{ id: string; name: string; registerNumber: string; reason: string }>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_STUDENTS = 600;

export async function changeClass(
  payload: Payload,
  actor: RecordEventInput["actor"],
  input: { studentIds: unknown; fromClassLevelId: unknown; toClassLevelId: unknown; note?: unknown },
): Promise<ClassChangeResult> {
  const ids = Array.isArray(input.studentIds) ? [...new Set(input.studentIds.map(String))] : [];
  const from = String(input.fromClassLevelId ?? "");
  const to = String(input.toClassLevelId ?? "");
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 300) : "";
  if (ids.length === 0) throw new ClassChangeError("Choose at least one student.");
  if (ids.length > MAX_STUDENTS) throw new ClassChangeError(`Move at most ${MAX_STUDENTS} students at a time.`);
  if (!ids.every((id) => UUID.test(id)) || !UUID.test(from) || !UUID.test(to)) throw new ClassChangeError("That request isn't valid.");
  if (from === to) throw new ClassChangeError("Choose a different class to move to.");

  const pool = (payload.db as unknown as { pool: Queryable }).pool;

  const classes = (await pool.query(`SELECT id, label, "order", school_id FROM class_levels WHERE id = ANY($1::uuid[])`, [[from, to]])).rows;
  const fromClass = classes.find((row) => String(row.id) === from);
  const toClass = classes.find((row) => String(row.id) === to);
  if (!fromClass || !toClass) throw new ClassChangeError("That class doesn't exist.", 404);
  if (String(fromClass.school_id) !== String(toClass.school_id)) throw new ClassChangeError("Both classes must belong to the same school.");
  const schoolId = String(fromClass.school_id);
  const fromLabel = String(fromClass.label);
  const toLabel = String(toClass.label);
  const direction: ClassChangeDirection = Number(toClass.order) > Number(fromClass.order) ? "promoted" : Number(toClass.order) < Number(fromClass.order) ? "demoted" : "changed";

  const movedRows = (
    await pool.query(
      `UPDATE users u SET class_level_id = $2, updated_at = now()
        WHERE u.id = ANY($1::uuid[]) AND u.class_level_id = $3 AND u.school_id = $4 AND u.role = 'student'
          AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.user_id = u.id AND p.status = 'pending')
        RETURNING u.id, u.name, u.username`,
      [ids, to, from, schoolId],
    )
  ).rows;
  const moved = movedRows.map((row) => ({ id: String(row.id), name: String(row.name), registerNumber: String(row.username) }));
  const movedIds = new Set(moved.map((student) => student.id));

  // Anyone asked for but not moved: say why, so nobody is silently left behind.
  const leftIds = ids.filter((id) => !movedIds.has(id));
  const skipped: ClassChangeResult["skipped"] = [];
  if (leftIds.length > 0) {
    const rows = (
      await pool.query(
        `SELECT u.id, u.name, u.username, u.class_level_id,
                EXISTS (SELECT 1 FROM payments p WHERE p.user_id = u.id AND p.status = 'pending') AS has_pending
           FROM users u WHERE u.id = ANY($1::uuid[])`,
        [leftIds],
      )
    ).rows;
    for (const row of rows) {
      const reason = row.has_pending
        ? "Has a payment in progress — try again once it is finished or cancelled."
        : String(row.class_level_id) !== from
          ? `Is no longer in ${fromLabel} (already moved?).`
          : "Could not be moved.";
      skipped.push({ id: String(row.id), name: String(row.name), registerNumber: String(row.username), reason });
    }
  }

  // The permanent record of who moved whom. Logged after the move; a logging hiccup never undoes it.
  const batchId = randomUUID();
  const verb = direction === "promoted" ? "Promoted" : direction === "demoted" ? "Moved back" : "Class changed";
  for (let start = 0; start < moved.length; start += 10) {
    await Promise.all(
      moved.slice(start, start + 10).map((student) =>
        recordEvent(payload, {
          eventType: `class.${direction}`,
          entityType: "student",
          entityId: student.id,
          schoolId,
          studentId: student.id,
          studentName: student.name,
          registerNumber: student.registerNumber,
          actor,
          summary: `${verb} from ${fromLabel} to ${toLabel}${note ? ` — ${note}` : ""}`,
          details: { fromClassLevelId: from, toClassLevelId: to, fromLabel, toLabel, batchId, batchSize: moved.length, ...(note ? { note } : {}) },
        }),
      ),
    );
  }

  return { direction, fromLabel, toLabel, moved, skipped };
}
