import type { Payload } from "payload";
import { oppositeLanguage } from "@/lib/academic-language";
import { recordEvent } from "@/lib/server/record-events";
import type { AcademicLanguage, BookSelection, Elective, Stream } from "@/types";

/**
 * Server-only. A student's book-set choice (second language, main group, secondary specialization).
 *
 * The student chooses it themselves on Essentials -> Books — until they have bought (or are paying
 * for) books of their CURRENT class; from then on it is locked and only school staff can change it
 * (Students -> profile). Every change is logged in `book_change_requests` (status "applied") with the
 * class the student was in, so staff see who changed what, when.
 *
 * Second language is stored the way the roster import stores it: academic_language = that language,
 * language_level = 'second' (see secondLanguageOf in src/lib/academic-language.ts).
 */
interface Queryable {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
}
interface PoolLike extends Queryable {
  connect: () => Promise<Queryable & { release: () => void }>;
}
const poolOf = (payload: Payload) => (payload.db as unknown as { pool: PoolLike }).pool;

export class SelectionError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const LANGUAGES = new Set(["hindi", "telugu"]);
const STREAMS = new Set(["science", "economics"]);
const ELECTIVES = new Set(["ena", "roboticsAI", "homeScience"]);

interface StudentRow {
  id: string;
  name: string;
  username: string;
  school_id: string;
  class_level_id: string;
  class_label: string | null;
  academic_language: string | null;
  language_level: string | null;
  stream: string | null;
  elective: string | null;
}

async function loadStudent(db: Queryable, studentId: string): Promise<StudentRow> {
  const row = (
    await db.query(
      `SELECT u.id, u.name, u.username, u.school_id, u.class_level_id, cl.label AS class_label,
              u.academic_language::text AS academic_language, u.language_level::text AS language_level,
              u.stream::text AS stream, u.elective::text AS elective
         FROM users u LEFT JOIN class_levels cl ON cl.id = u.class_level_id
        WHERE u.id = $1`,
      [studentId],
    )
  ).rows[0] as unknown as StudentRow | undefined;
  if (!row) throw new SelectionError("Your account could not be found.", 404);
  return row;
}

function currentSelection(row: Pick<StudentRow, "academic_language" | "language_level" | "stream" | "elective">): BookSelection {
  const language = row.academic_language as AcademicLanguage | null;
  return {
    secondLanguage: language ? (row.language_level === "second" ? language : oppositeLanguage(language)) : undefined,
    stream: (row.stream as Stream | null) ?? undefined,
    elective: (row.elective as Elective | null) ?? undefined,
  };
}

/** True once the student has paid for — or is in the middle of paying for — books of their current class. */
export async function isBookSetLocked(db: Queryable, studentId: string, classLevelId: string): Promise<boolean> {
  const row = (
    await db.query(
      `SELECT EXISTS (
                SELECT 1 FROM orders o
                  JOIN orders_items oi ON oi._parent_id = o.id
                  JOIN books b ON b.id::text = oi.ref_id
                 WHERE o.user_id = $1 AND o.status = 'paid' AND oi.kind = 'book' AND b.class_level_id = $2
              ) OR EXISTS (
                SELECT 1 FROM payments p
                  JOIN payments_items pi ON pi._parent_id = p.id
                  JOIN books b ON b.id::text = pi.ref_id
                 WHERE p.user_id = $1 AND p.status = 'pending' AND pi.kind = 'book' AND b.class_level_id = $2
              ) AS locked`,
      [studentId, classLevelId],
    )
  ).rows[0];
  return Boolean(row?.locked);
}

export async function getSelectionState(payload: Payload, studentId: string): Promise<{ locked: boolean; current: BookSelection }> {
  const db = poolOf(payload);
  const student = await loadStudent(db, studentId);
  return { locked: await isBookSetLocked(db, studentId, student.class_level_id), current: currentSelection(student) };
}

/**
 * Saves the student's own choice. Only the parts that differ are changed (and logged); a value the
 * class's book list doesn't offer is refused. Returns whether anything changed.
 */
export async function saveStudentSelection(payload: Payload, studentId: string, requested: Record<string, unknown>): Promise<{ changed: boolean }> {
  const pool = poolOf(payload);
  const student = await loadStudent(pool, studentId);

  // What this class's book list actually offers.
  const offered = (
    await pool.query(
      `SELECT DISTINCT language::text AS language, stream::text AS stream, elective::text AS elective
         FROM books WHERE class_level_id = $1 AND school_id = $2`,
      [student.class_level_id, student.school_id],
    )
  ).rows;
  const offers = (key: "language" | "stream" | "elective", value: string) => offered.some((row) => row[key] === value);

  const pick = (value: unknown, allowed: Set<string>, key: "language" | "stream" | "elective") => {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value !== "string" || !allowed.has(value) || !offers(key, value)) throw new SelectionError("That choice isn't available for your class.");
    return value;
  };
  const wanted: BookSelection = {
    secondLanguage: pick(requested.secondLanguage, LANGUAGES, "language") as AcademicLanguage | undefined,
    stream: pick(requested.stream, STREAMS, "stream") as Stream | undefined,
    elective: pick(requested.elective, ELECTIVES, "elective") as Elective | undefined,
  };

  const current = currentSelection(student);
  const changes: BookSelection = {
    secondLanguage: wanted.secondLanguage && wanted.secondLanguage !== current.secondLanguage ? wanted.secondLanguage : undefined,
    stream: wanted.stream && wanted.stream !== current.stream ? wanted.stream : undefined,
    elective: wanted.elective && wanted.elective !== current.elective ? wanted.elective : undefined,
  };
  if (!changes.secondLanguage && !changes.stream && !changes.elective) return { changed: false };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Re-check inside the transaction (row locked) so a payment that just started can't race the change.
    await client.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [studentId]);
    if (await isBookSetLocked(client, studentId, student.class_level_id)) {
      throw new SelectionError("You've already bought your books for this class, so this can't be changed here. Please contact the school.", 409);
    }
    await client.query(
      `UPDATE users SET
          academic_language = COALESCE($2::text::enum_users_academic_language, academic_language),
          language_level = CASE WHEN $2::text IS NOT NULL THEN 'second'::enum_users_language_level ELSE language_level END,
          stream = COALESCE($3::text::enum_users_stream, stream),
          elective = COALESCE($4::text::enum_users_elective, elective),
          updated_at = now()
        WHERE id = $1`,
      [studentId, changes.secondLanguage ?? null, changes.stream ?? null, changes.elective ?? null],
    );
    await client.query(
      `INSERT INTO book_change_requests (
          school_id, user_id,
          requested_second_language, requested_stream, requested_elective,
          current_second_language, current_stream, current_elective,
          reason, status, decided_at, class_level_id, class_label, changed_by_type, changed_by_name)
        VALUES ($1, $2,
          $3::text::enum_book_change_requests_requested_second_language, $4::text::enum_book_change_requests_requested_stream, $5::text::enum_book_change_requests_requested_elective,
          $6::text::enum_book_change_requests_current_second_language, $7::text::enum_book_change_requests_current_stream, $8::text::enum_book_change_requests_current_elective,
          'Chosen by the student on Essentials > Books', 'applied', now(), $9, $10, 'student', $11)`,
      [
        student.school_id,
        studentId,
        changes.secondLanguage ?? null,
        changes.stream ?? null,
        changes.elective ?? null,
        current.secondLanguage ?? null,
        current.stream ?? null,
        current.elective ?? null,
        student.class_level_id,
        student.class_label,
        student.name,
      ],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  await recordEvent(payload, {
    eventType: "bookchange.changed",
    entityType: "student",
    entityId: studentId,
    schoolId: student.school_id,
    studentId,
    studentName: student.name,
    registerNumber: student.username,
    actor: { type: "student", id: studentId, name: student.name },
    summary: `Changed their book choice in ${student.class_label ?? "their class"}: ${describeChanges(current, changes)}`,
    details: { from: current, to: changes, classLevelId: student.class_level_id, classLabel: student.class_label },
  });
  return { changed: true };
}

const NAMES: Record<string, string> = { hindi: "Hindi", telugu: "Telugu", science: "Science", economics: "Economics", ena: "ENA", roboticsAI: "Robotics & AI", homeScience: "Home Science" };

export function describeChanges(from: BookSelection, to: BookSelection): string {
  const parts: string[] = [];
  if (to.secondLanguage) parts.push(`2nd language ${from.secondLanguage ? NAMES[from.secondLanguage] : "—"} → ${NAMES[to.secondLanguage]}`);
  if (to.stream) parts.push(`main group ${from.stream ? NAMES[from.stream] : "—"} → ${NAMES[to.stream]}`);
  if (to.elective) parts.push(`specialization ${from.elective ? NAMES[from.elective] : "—"} → ${NAMES[to.elective]}`);
  return parts.join(", ");
}
