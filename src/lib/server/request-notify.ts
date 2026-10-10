import type { Payload } from "payload";
import { sendTransactionalEmail } from "@/lib/email/brevo";

/**
 * Server-only. Who hears about a new exchange / subject-change request:
 * every ACTIVE administrator of the school, plus the optional extra inbox an
 * administrator set in Console → Administration (`schools.requestNotifyEmail`
 * — typed in, or picked from the staff list). `EXCHANGE_NOTIFY_EMAIL` in the
 * environment is an additional deploy-time override.
 *
 * Email problems must never fail the request that triggered them, so every
 * send here is swallowed after logging.
 */
export async function getStaffRecipients(payload: Payload, schoolId: string): Promise<Array<{ email: string; name?: string }>> {
  const byEmail = new Map<string, { email: string; name?: string }>();

  const admins = await payload.find({
    collection: "payload-admins",
    where: {
      and: [
        { role: { equals: "administrator" } },
        { status: { equals: "active" } },
        { isSharedDemoAccount: { not_equals: true } },
      ],
    },
    limit: 100,
    depth: 0,
  });
  for (const admin of admins.docs) {
    const email = String(admin.email ?? "").trim().toLowerCase();
    if (email) byEmail.set(email, { email, name: (admin.name as string | undefined) ?? undefined });
  }

  const school = await payload.findByID({ collection: "schools", id: schoolId, depth: 0 }).catch(() => null);
  const extras = [school?.requestNotifyEmail as string | undefined, process.env.EXCHANGE_NOTIFY_EMAIL];
  for (const extra of extras) {
    const email = (extra ?? "").trim().toLowerCase();
    if (email && !byEmail.has(email)) byEmail.set(email, { email });
  }

  return [...byEmail.values()];
}

/** The extra notification inbox on its own — it gets *every* update (decisions included), not just new requests. */
export async function getExtraNotifyEmail(payload: Payload, schoolId: string): Promise<string | null> {
  const school = await payload.findByID({ collection: "schools", id: schoolId, depth: 0 }).catch(() => null);
  const email = String((school?.requestNotifyEmail as string | undefined) ?? process.env.EXCHANGE_NOTIFY_EMAIL ?? "")
    .trim()
    .toLowerCase();
  return email || null;
}

export async function sendEmailsSafely(
  recipients: Array<{ email: string; name?: string }>,
  subject: string,
  html: string,
): Promise<void> {
  await Promise.allSettled(
    recipients.map(async (recipient) => {
      try {
        await sendTransactionalEmail({ to: recipient.email, toName: recipient.name, subject, html });
      } catch (error) {
        console.error(`[request-notify] "${subject}" to ${recipient.email} failed:`, error);
      }
    }),
  );
}
