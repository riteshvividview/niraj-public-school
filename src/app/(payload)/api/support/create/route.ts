import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/app-url";
import { isPlausiblePhone } from "@/lib/contact-links";
import { supportRequestedEmail } from "@/lib/email/request-templates";
import { getRequestActor, jsonError, relId } from "@/lib/server/request-actor";
import { getStaffRecipients, sendEmailsSafely } from "@/lib/server/request-notify";

const MESSAGE_MIN = 5;
const MESSAGE_MAX = 1000;
/** Keeps the staff inbox usable if one account (or a script) floods it. */
const MAX_UNRESOLVED = 5;
const MAX_PER_DAY = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A parent/student sends one query to the school. Staff contact them directly — there is no chat. */
export async function POST(request: Request) {
  const actor = await getRequestActor(request);
  if (actor.kind !== "student") return jsonError("Please log in to contact the school.", 401);
  const { payload, user } = actor;

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const phoneInput = typeof body?.contactPhone === "string" ? body.contactPhone.trim() : "";
  const emailInput = typeof body?.contactEmail === "string" ? body.contactEmail.trim().toLowerCase() : "";

  if (message.length < MESSAGE_MIN) return jsonError("Please write your question (at least a few words).", 400);
  if (message.length > MESSAGE_MAX) return jsonError(`Keep your message under ${MESSAGE_MAX} characters.`, 400);
  if (phoneInput && !isPlausiblePhone(phoneInput)) return jsonError("That phone number doesn't look right.", 400);
  if (emailInput && !EMAIL_PATTERN.test(emailInput)) return jsonError("That email address doesn't look right.", 400);

  // The school must have some way to reach the family: what they typed, else what's on their profile.
  const student = await payload.findByID({ collection: "users", id: user.id, depth: 0 });
  const contactPhone = phoneInput || (student.mobileNumber as string | undefined) || "";
  const contactEmail = emailInput || (student.email as string | undefined) || "";
  if (!contactPhone && !contactEmail) {
    return jsonError("Please add a phone number or email so the school can reach you.", 422, { reason: "no-contact" });
  }

  const unresolved = await payload.count({
    collection: "support-requests",
    where: { and: [{ user: { equals: user.id } }, { status: { not_equals: "resolved" } }] },
  });
  if (unresolved.totalDocs >= MAX_UNRESOLVED) {
    return jsonError("You already have several open queries. Please wait for the school to get back to you.", 429);
  }
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const today = await payload.count({
    collection: "support-requests",
    where: { and: [{ user: { equals: user.id } }, { createdAt: { greater_than: since } }] },
  });
  if (today.totalDocs >= MAX_PER_DAY) {
    return jsonError("You've sent a lot of queries today. Please try again tomorrow or call the school.", 429);
  }

  const schoolId = relId(student.school);
  let created;
  try {
    created = await payload.create({
      collection: "support-requests",
      data: {
        school: schoolId,
        user: user.id,
        message,
        contactPhone: contactPhone || undefined,
        contactEmail: contactEmail || undefined,
        status: "open",
      },
      depth: 0,
    });
  } catch (error) {
    console.error("[support/create] failed:", error);
    return jsonError("We couldn't send your message. Please try again.", 500);
  }

  try {
    const classLevel = await payload
      .findByID({ collection: "class-levels", id: relId(student.classLevel), depth: 0 })
      .catch(() => null);
    const recipients = await getStaffRecipients(payload, schoolId);
    await sendEmailsSafely(
      recipients,
      `New parent support query — ${student.name}`,
      supportRequestedEmail({
        student: {
          name: String(student.name),
          registerNumber: String(student.username ?? ""),
          className: classLevel?.label as string | undefined,
          section: (student.section as string | undefined) ?? undefined,
          mobileNumber: (student.mobileNumber as string | undefined) ?? undefined,
        },
        message,
        contactPhone: contactPhone || undefined,
        contactEmail: contactEmail || undefined,
        consoleUrl: `${getAppUrl(request)}/console/support`,
      }),
    );
  } catch (error) {
    console.error("[support/create] notification failed:", error);
  }

  return NextResponse.json({ ok: true, id: created.id });
}
