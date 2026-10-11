import { NextResponse } from "next/server";
import { newAdmissionItemApplies } from "@/lib/academic-year";
import { getAppUrl } from "@/lib/app-url";
import { extraItemRequestedEmail } from "@/lib/email/request-templates";
import { eventActor, recordRequestEvent } from "@/lib/server/record-events";
import { getRequestActor, isUniqueViolation, jsonError, relId } from "@/lib/server/request-actor";
import { getStaffRecipients, sendEmailsSafely } from "@/lib/server/request-notify";
import { getNewAdmissionStatus } from "@/lib/server/uniform/new-admission";

type Doc = Record<string, unknown>;
const NOTE_MAX = 500;

/**
 * A new-admission student who already bought their full set asks to buy ONE extra uniform
 * item (only staff know if it is in stock). Creates a pending request and emails the staff.
 */
export async function POST(request: Request) {
  const actor = await getRequestActor(request);
  if (actor.kind !== "student") return jsonError("Please log in to continue.", 401);
  const { payload, user } = actor;

  const body = await request.json().catch(() => null);
  const itemId = typeof body?.uniformItemId === "string" ? body.uniformItemId : "";
  const size = typeof body?.size === "string" ? body.size.trim() : "";
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  if (!itemId || !size) return jsonError("Choose an item and a size.", 400);
  if (note.length > NOTE_MAX) return jsonError(`Keep the note under ${NOTE_MAX} characters.`, 400);

  const status = await getNewAdmissionStatus(payload, user.id);
  if (!status.isNew) return jsonError("You can buy uniform items directly — no request is needed.", 400, { reason: "not-new" });
  if (!status.setBought) {
    return jsonError("Please buy the full new-admission uniform set first. Single items can be requested after that.", 409, { reason: "set-not-bought" });
  }

  const student = (await payload.findByID({ collection: "users", id: user.id, depth: 0 })) as unknown as Doc;
  const schoolId = relId(student.school);
  const item = (await payload.findByID({ collection: "uniform-items", id: itemId, depth: 0 }).catch(() => null)) as Doc | null;
  if (!item || item.retired || relId(item.school) !== schoolId) return jsonError("That item isn't available.", 404);
  const classLevel = (await payload.findByID({ collection: "class-levels", id: relId(student.classLevel), depth: 0 })) as unknown as Doc;
  const applies = item.newAdmission
    ? newAdmissionItemApplies(
        { gender: item.gender as string | undefined, fromOrder: item.newAdmissionFromOrder as number | null, toOrder: item.newAdmissionToOrder as number | null },
        { gender: student.gender as string | undefined, classOrder: Number(classLevel.order) },
      )
    : relId(item.classLevel) === relId(student.classLevel) && (!item.gender || !student.gender || item.gender === student.gender);
  if (!applies) return jsonError("That item isn't available for your class.", 404);
  if (!((item.sizeOptions as Array<{ size: string }>) ?? []).some((option) => option.size === size)) return jsonError("That size isn't available.", 400);

  let created;
  try {
    created = await payload.create({
      collection: "extra-item-requests",
      data: { school: schoolId, user: user.id, uniformItem: itemId, itemLabel: String(item.name), size, note: note || undefined, status: "pending" },
      depth: 0,
    });
  } catch (error) {
    if (isUniqueViolation(error)) return jsonError("You already have an open request for this item and size.", 409);
    console.error("[extra-items/create] failed:", error);
    return jsonError("We couldn't send your request. Please try again.", 500);
  }

  await recordRequestEvent(payload, created as unknown as Record<string, unknown>, {
    eventType: "extra.requested",
    entityType: "extra-item",
    actor: eventActor(actor),
    summary: `Asked to buy an extra item: ${String(item.name)} (${size})`,
    details: { item: String(item.name), size, note: note || null },
  });

  try {
    const recipients = await getStaffRecipients(payload, schoolId);
    await sendEmailsSafely(
      recipients,
      `Extra uniform item request — ${String(student.name)}`,
      extraItemRequestedEmail({
        student: {
          name: String(student.name),
          registerNumber: String(student.username ?? ""),
          className: String(classLevel.label ?? ""),
          section: (student.section as string | undefined) ?? undefined,
          mobileNumber: (student.mobileNumber as string | undefined) ?? undefined,
        },
        itemLabel: String(item.name),
        size,
        note: note || undefined,
        consoleUrl: `${getAppUrl(request)}/console/extra-item-requests`,
      }),
    );
  } catch (error) {
    console.error("[extra-items/create] notification failed:", error);
  }
  return NextResponse.json({ ok: true, id: created.id });
}
