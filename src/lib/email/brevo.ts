/**
 * Server-only — never import this from a client component. Reads
 * BREVO_API_KEY directly from process.env, which is only ever populated in
 * a server runtime (Payload hooks, Next.js Route Handlers).
 *
 * Uses plain `fetch` against Brevo's transactional email API directly —
 * no SDK needed for a single endpoint, and this project has no HTTP client
 * beyond native fetch already.
 */
interface SendEmailInput {
  to: string;
  toName?: string;
  subject: string;
  html: string;
}

export async function sendTransactionalEmail({ to, toName, subject, html }: SendEmailInput): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME ?? "Niraj Public School";

  if (!apiKey || !senderEmail) {
    console.warn(`[brevo] BREVO_API_KEY/BREVO_SENDER_EMAIL not set — skipping email "${subject}" to ${to}`);
    return;
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: to, name: toName ?? to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[brevo] Failed to send "${subject}" to ${to}: ${res.status} ${body}`);
  }
}
