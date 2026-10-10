import type { Payload, PayloadRequest } from "payload";
import { relId } from "@/lib/server/request-actor";

/**
 * Server-only. Appends one line to the permanent activity log
 * (`record_events`, append-only — see the migration). Logging must never
 * break the action it describes, so every failure is caught and reported to
 * the server log instead of thrown.
 */
export interface RecordEventInput {
  eventType: string;
  entityType: string;
  entityId?: string;
  schoolId: string;
  studentId: string;
  /** Provide to skip a lookup when the caller already has the student loaded. */
  studentName?: string;
  registerNumber?: string;
  receiptCode?: string;
  actor: { type: "student" | "staff" | "system"; id?: string; name?: string };
  summary: string;
  details?: Record<string, unknown>;
}

/** Who triggered a Payload hook/request, as an event actor. */
export function actorFromUser(user: unknown): RecordEventInput["actor"] {
  const u = user as { id?: string; name?: string; email?: string; collection?: string } | null | undefined;
  if (!u?.id) return { type: "system", name: "System" };
  if (u.collection === "payload-admins") return { type: "staff", id: String(u.id), name: u.name ?? u.email ?? "Staff" };
  return { type: "student", id: String(u.id), name: u.name ?? "Student" };
}

/** The event actor for a route's authenticated caller. */
export function eventActor(actor: { kind: string; user?: { id: string; name?: string; email?: string } }): RecordEventInput["actor"] {
  if (actor.kind === "staff" && actor.user) return { type: "staff", id: actor.user.id, name: actor.user.name ?? actor.user.email ?? "Staff" };
  if (actor.kind === "student" && actor.user) return { type: "student", id: actor.user.id, name: actor.user.name ?? "Student" };
  return { type: "system", name: "System" };
}

/**
 * `req` — pass it when logging from inside a Payload hook that has itself just
 * written a row the event refers to (e.g. the Users hook, whose own user row is
 * still locked by the open transaction): the insert then joins that transaction
 * instead of waiting on a lock the hook is itself holding.
 */
export async function recordEvent(payload: Payload, input: RecordEventInput, req?: PayloadRequest): Promise<void> {
  try {
    let { studentName, registerNumber } = input;
    if (!studentName) {
      const student = await payload.findByID({ collection: "users", id: input.studentId, depth: 0, req });
      studentName = String(student.name ?? "Unknown");
      registerNumber = registerNumber ?? (student.username as string | undefined);
    }
    await payload.create({
      collection: "record-events",
      data: {
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId,
        school: input.schoolId,
        student: input.studentId,
        studentName,
        registerNumber,
        receiptCode: input.receiptCode,
        actorType: input.actor.type,
        actorId: input.actor.id,
        actorName: input.actor.name,
        summary: input.summary,
        details: input.details,
      },
      depth: 0,
      req,
    });
  } catch (error) {
    console.error(`[record-events] could not log "${input.eventType}":`, error);
  }
}

/** Convenience for the request routes: logs an event about a request document that has `school` / `user` relations. */
export async function recordRequestEvent(
  payload: Payload,
  doc: Record<string, unknown>,
  input: Pick<RecordEventInput, "eventType" | "entityType" | "summary" | "actor" | "details" | "receiptCode">,
): Promise<void> {
  await recordEvent(payload, {
    ...input,
    entityId: String(doc.id),
    schoolId: relId(doc.school),
    studentId: relId(doc.user),
  });
}
