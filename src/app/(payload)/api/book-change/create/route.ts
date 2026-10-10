import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/app-url";
import { assignedBookSetOf } from "@/lib/book-set";
import { bookChangeRequestedEmail } from "@/lib/email/request-templates";
import { getRequestActor, isUniqueViolation, jsonError, relId } from "@/lib/server/request-actor";
import { eventActor, recordRequestEvent } from "@/lib/server/record-events";
import { getStaffRecipients, sendEmailsSafely } from "@/lib/server/request-notify";
import { selectionLabels, VALID_ELECTIVES, VALID_LANGUAGES, VALID_STREAMS } from "@/lib/server/book-change-labels";

const REASON_MIN = 3;
const REASON_MAX = 300;

/**
 * A student asks the school to change their assigned second language and/or
 * specialization(s). Only fields that currently HAVE an assigned value can be
 * changed this way (an unset field is chosen directly on the Books page), the
 * requested value must differ from the current one and must actually exist in
 * the student's class catalogue, and only one request may be pending at a time.
 */
export async function POST(request: Request) {
  const actor = await getRequestActor(request);
  if (actor.kind !== "student") return jsonError("Please log in as a student to request a change.", 401);
  const { payload, user } = actor;

  const body = await request.json().catch(() => null);
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (reason.length < REASON_MIN) return jsonError("Please tell the school why you want this change.", 400);
  if (reason.length > REASON_MAX) return jsonError(`Keep the reason under ${REASON_MAX} characters.`, 400);

  const wanted = {
    secondLanguage: typeof body?.secondLanguage === "string" ? body.secondLanguage : undefined,
    stream: typeof body?.stream === "string" ? body.stream : undefined,
    elective: typeof body?.elective === "string" ? body.elective : undefined,
  };
  if (
    (wanted.secondLanguage && !VALID_LANGUAGES.includes(wanted.secondLanguage)) ||
    (wanted.stream && !VALID_STREAMS.includes(wanted.stream)) ||
    (wanted.elective && !VALID_ELECTIVES.includes(wanted.elective))
  ) {
    return jsonError("That option isn't valid.", 400);
  }
  if (!wanted.secondLanguage && !wanted.stream && !wanted.elective) {
    return jsonError("Choose what you would like to change.", 400);
  }

  const student = await payload.findByID({ collection: "users", id: user.id, depth: 0 });
  const current = assignedBookSetOf({
    academicLanguage: student.academicLanguage ?? undefined,
    languageLevel: student.languageLevel ?? undefined,
    stream: student.stream ?? undefined,
    elective: student.elective ?? undefined,
  });
  const schoolId = relId(student.school);
  const classLevelId = relId(student.classLevel);

  // Catalogue for this student's class — what is actually offered.
  const books = await payload.find({
    collection: "books",
    where: { and: [{ school: { equals: schoolId } }, { classLevel: { equals: classLevelId } }] },
    limit: 500,
    depth: 0,
  });
  const offered = {
    secondLanguage: new Set(books.docs.map((b) => b.language).filter(Boolean) as string[]),
    stream: new Set(books.docs.map((b) => b.stream).filter(Boolean) as string[]),
    elective: new Set(books.docs.map((b) => b.elective).filter(Boolean) as string[]),
  };

  const requested: { secondLanguage?: string; stream?: string; elective?: string } = {};
  for (const field of ["secondLanguage", "stream", "elective"] as const) {
    const value = wanted[field];
    if (!value) continue;
    if (!current[field]) {
      return jsonError("That choice hasn't been assigned yet — you can pick it directly on the Books page.", 422);
    }
    if (value === current[field]) return jsonError("That is already your assigned option.", 422);
    if (!offered[field].has(value)) return jsonError("That option isn't available for your class.", 422);
    requested[field] = value;
  }

  let created;
  try {
    created = await payload.create({
      collection: "book-change-requests",
      data: {
        school: schoolId,
        user: user.id,
        requested,
        current: { secondLanguage: current.secondLanguage, stream: current.stream, elective: current.elective },
        reason,
        status: "pending",
      },
      depth: 0,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonError("You already have a change request waiting for the school.", 409, { reason: "already-pending" });
    }
    console.error("[book-change/create] failed:", error);
    return jsonError("We couldn't save your request. Please try again.", 500);
  }

  const asText = (labels: ReturnType<typeof selectionLabels>) =>
    [labels.secondLanguage, labels.stream, labels.elective].filter(Boolean).join(" · ");
  await recordRequestEvent(payload, created as unknown as Record<string, unknown>, {
    eventType: "bookchange.requested",
    entityType: "bookchange",
    actor: eventActor(actor),
    summary: `Subject change requested: ${asText(selectionLabels(current))} → ${asText(selectionLabels({ ...current, ...requested }))} — ${reason}`,
    details: { current, requested, reason },
  });

  try {
    const classLevel = await payload.findByID({ collection: "class-levels", id: classLevelId, depth: 0 }).catch(() => null);
    const recipients = await getStaffRecipients(payload, schoolId);
    await sendEmailsSafely(
      recipients,
      `New subject change request — ${student.name}`,
      bookChangeRequestedEmail({
        student: {
          name: String(student.name),
          registerNumber: String(student.username ?? ""),
          className: classLevel?.label as string | undefined,
          section: (student.section as string | undefined) ?? undefined,
          mobileNumber: (student.mobileNumber as string | undefined) ?? undefined,
        },
        current: selectionLabels(current),
        requested: selectionLabels(requested),
        reason,
        consoleUrl: `${getAppUrl(request)}/console/subject-change-requests`,
      }),
    );
  } catch (error) {
    console.error("[book-change/create] notification failed:", error);
  }

  return NextResponse.json({ ok: true, id: created.id });
}
