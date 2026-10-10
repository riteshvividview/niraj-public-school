import { COLORS, formatINR, infoBanner, wrapper } from "./templates";

/**
 * Emails for exchange requests and book/subject-change requests. Everything
 * a student or staff member typed (names, reasons, notes) is interpolated
 * into HTML below, so it all goes through escapeHtml first.
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function detailRows(rows: Array<[string, string | undefined | null]>): string {
  const filled = rows.filter((row): row is [string, string] => Boolean(row[1]));
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:14px 0;border:1px solid ${COLORS.line};">
    ${filled
      .map(
        ([label, value], i) => `<tr>
      <td style="padding:10px 14px;width:38%;background:${i % 2 === 0 ? "#f7f9fc" : "#ffffff"};font-size:12px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:${COLORS.sub};vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:10px 14px;background:${i % 2 === 0 ? "#f7f9fc" : "#ffffff"};font-size:14px;color:${COLORS.ink};">${value}</td>
    </tr>`,
      )
      .join("")}
  </table>`;
}

export function priceDifferenceText(difference: number, audience: "staff" | "family"): string {
  if (difference > 0) {
    return audience === "staff"
      ? `Parent pays ${formatINR(difference)} at the counter`
      : `You pay ${formatINR(difference)} at the counter`;
  }
  if (difference < 0) {
    return audience === "staff"
      ? `School adjusts ${formatINR(Math.abs(difference))} in the parent's favour`
      : `The school adjusts ${formatINR(Math.abs(difference))} in your favour at the counter`;
  }
  return "No price difference";
}

function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 6px;"><tr><td style="background:${COLORS.brand};border-radius:10px;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a></td></tr></table>`;
}

export interface StudentSummary {
  name: string;
  registerNumber: string;
  className?: string;
  section?: string;
  mobileNumber?: string;
}

function studentRows(student: StudentSummary): Array<[string, string | undefined]> {
  return [
    ["Student", escapeHtml(student.name)],
    ["Register no.", escapeHtml(student.registerNumber)],
    [
      "Class",
      student.className ? escapeHtml(`${student.className}${student.section ? ` - ${student.section}` : ""}`) : undefined,
    ],
    ["Phone", student.mobileNumber ? escapeHtml(student.mobileNumber) : undefined],
  ];
}

const STAFF_FOOTER =
  "You are receiving this because you are a school administrator or the school's request-notification contact.";

/** To school staff — a parent just asked to exchange a collected uniform item. */
export function exchangeRequestedEmail(args: {
  student: StudentSummary;
  receiptCode: string;
  itemLabel: string;
  fromSize: string;
  toSize: string;
  quantity: number;
  reasonLabel: string;
  note?: string;
  priceDifference: number;
  consoleUrl: string;
}): string {
  return wrapper({
    eyebrow: "Action needed",
    title: "New Uniform Exchange Request",
    headerGradient: `linear-gradient(135deg, ${COLORS.accent} 0%, #b56f00 100%)`,
    bodyHtml: `
      <p style="font-size:15px;line-height:1.6;color:${COLORS.ink};margin:0 0 4px;">A parent has asked to exchange a collected uniform item. Please review it in the School Console.</p>
      ${detailRows([
        ...studentRows(args.student),
        ["Receipt code", `<span style="font-family:'Courier New',monospace;font-weight:700;">${escapeHtml(args.receiptCode)}</span>`],
        ["Item", escapeHtml(args.itemLabel)],
        ["Exchange", `${escapeHtml(args.fromSize)} &rarr; <strong>${escapeHtml(args.toSize)}</strong> (qty ${args.quantity})`],
        ["Reason", escapeHtml(args.reasonLabel)],
        ["Parent's note", args.note ? escapeHtml(args.note) : undefined],
        ["Price difference", escapeHtml(priceDifferenceText(args.priceDifference, "staff"))],
      ])}
      ${ctaButton(args.consoleUrl, "Open Exchange Requests")}
    `,
    footerNote: STAFF_FOOTER,
  });
}

/** To staff — the parent withdrew their own pending request. */
export function exchangeCancelledByParentEmail(args: {
  student: StudentSummary;
  receiptCode: string;
  itemLabel: string;
  fromSize: string;
  toSize: string;
}): string {
  return wrapper({
    eyebrow: "Request withdrawn",
    title: "Exchange Request Cancelled",
    headerGradient: `linear-gradient(135deg, ${COLORS.sub} 0%, #3d4452 100%)`,
    bodyHtml: `
      <p style="font-size:15px;line-height:1.6;color:${COLORS.ink};margin:0 0 4px;">The parent withdrew this exchange request. No action is needed.</p>
      ${detailRows([
        ...studentRows(args.student),
        ["Receipt code", `<span style="font-family:'Courier New',monospace;font-weight:700;">${escapeHtml(args.receiptCode)}</span>`],
        ["Item", escapeHtml(args.itemLabel)],
        ["Exchange", `${escapeHtml(args.fromSize)} &rarr; ${escapeHtml(args.toSize)}`],
      ])}
    `,
    footerNote: STAFF_FOOTER,
  });
}

/** To the family — staff approved / rejected / completed / cancelled their request. */
export function exchangeDecisionEmail(args: {
  outcome: "approved" | "rejected" | "completed" | "cancelled";
  receiptCode: string;
  itemLabel: string;
  fromSize: string;
  toSize: string;
  quantity: number;
  staffNote?: string;
  priceDifference: number;
}): string {
  const content = {
    approved: {
      eyebrow: "Request approved",
      title: "Your Exchange Was Approved",
      gradient: `linear-gradient(135deg, ${COLORS.brand2} 0%, #086b60 100%)`,
      lead: "✅ Good news — the school approved your exchange request.",
      next: `<strong>What to do next:</strong> bring the item to the school counter along with your receipt code. ${escapeHtml(priceDifferenceText(args.priceDifference, "family"))}.`,
    },
    rejected: {
      eyebrow: "Request not approved",
      title: "Your Exchange Was Not Approved",
      gradient: "linear-gradient(135deg, #b42318 0%, #7a1810 100%)",
      lead: "Unfortunately the school could not approve this exchange request.",
      next: "If you have questions, please contact the school office.",
    },
    completed: {
      eyebrow: "Exchange complete",
      title: "Your Exchange Is Complete",
      gradient: `linear-gradient(135deg, ${COLORS.brand2} 0%, #086b60 100%)`,
      lead: "🎉 The exchange was completed at the school counter.",
      next: "Thank you! Keep this email for your records.",
    },
    cancelled: {
      eyebrow: "Request cancelled",
      title: "Your Exchange Request Was Cancelled",
      gradient: `linear-gradient(135deg, ${COLORS.accent} 0%, #b56f00 100%)`,
      lead: "The school cancelled this exchange request.",
      next: "If you still need a different size, you can raise a new request from the Exchange tab or contact the school office.",
    },
  }[args.outcome];

  return wrapper({
    eyebrow: content.eyebrow,
    title: content.title,
    headerGradient: content.gradient,
    bodyHtml: `
      <p style="font-size:15px;line-height:1.6;color:${COLORS.ink};margin:0 0 4px;">${content.lead}</p>
      ${detailRows([
        ["Receipt code", `<span style="font-family:'Courier New',monospace;font-weight:700;">${escapeHtml(args.receiptCode)}</span>`],
        ["Item", escapeHtml(args.itemLabel)],
        ["Exchange", `${escapeHtml(args.fromSize)} &rarr; <strong>${escapeHtml(args.toSize)}</strong> (qty ${args.quantity})`],
        ["Note from school", args.staffNote ? escapeHtml(args.staffNote) : undefined],
      ])}
      ${infoBanner({ icon: "📍", bg: "#eaf1ff", border: "#c9dbfd", text: content.next })}
    `,
  });
}

export interface SelectionLabels {
  secondLanguage?: string;
  stream?: string;
  elective?: string;
}

function selectionHtml(labels: SelectionLabels): string {
  return (
    [
      labels.secondLanguage ? `Second language: <strong>${escapeHtml(labels.secondLanguage)}</strong>` : null,
      labels.stream ? `Specialization: <strong>${escapeHtml(labels.stream)}</strong>` : null,
      labels.elective ? `Specialization 2: <strong>${escapeHtml(labels.elective)}</strong>` : null,
    ]
      .filter(Boolean)
      .join("<br>") || "—"
  );
}

/** To school staff — a student asked to switch their assigned book set. */
export function bookChangeRequestedEmail(args: {
  student: StudentSummary;
  current: SelectionLabels;
  requested: SelectionLabels;
  reason: string;
  consoleUrl: string;
}): string {
  return wrapper({
    eyebrow: "Action needed",
    title: "New Subject Change Request",
    headerGradient: `linear-gradient(135deg, ${COLORS.brand} 0%, #1d4fb8 100%)`,
    bodyHtml: `
      <p style="font-size:15px;line-height:1.6;color:${COLORS.ink};margin:0 0 4px;">A student asked to change their assigned books (language / specialization). Please review it in the School Console — you may want to call the parent to confirm first.</p>
      ${detailRows([
        ...studentRows(args.student),
        ["Currently assigned", selectionHtml(args.current)],
        ["Requested change", selectionHtml(args.requested)],
        ["Reason", escapeHtml(args.reason)],
      ])}
      ${ctaButton(args.consoleUrl, "Open Subject Change Requests")}
    `,
    footerNote: STAFF_FOOTER,
  });
}

/** To staff — the student withdrew their own pending request. */
export function bookChangeCancelledByStudentEmail(args: { student: StudentSummary; requested: SelectionLabels }): string {
  return wrapper({
    eyebrow: "Request withdrawn",
    title: "Subject Change Request Cancelled",
    headerGradient: `linear-gradient(135deg, ${COLORS.sub} 0%, #3d4452 100%)`,
    bodyHtml: `
      <p style="font-size:15px;line-height:1.6;color:${COLORS.ink};margin:0 0 4px;">The student withdrew this request. No action is needed.</p>
      ${detailRows([...studentRows(args.student), ["Had requested", selectionHtml(args.requested)]])}
    `,
    footerNote: STAFF_FOOTER,
  });
}

/** To the family — staff approved / rejected their subject change. */
export function bookChangeDecisionEmail(args: {
  outcome: "approved" | "rejected";
  requested: SelectionLabels;
  staffNote?: string;
}): string {
  const approved = args.outcome === "approved";
  return wrapper({
    eyebrow: approved ? "Request approved" : "Request not approved",
    title: approved ? "Your Subject Change Was Approved" : "Your Subject Change Was Not Approved",
    headerGradient: approved
      ? `linear-gradient(135deg, ${COLORS.brand2} 0%, #086b60 100%)`
      : "linear-gradient(135deg, #b42318 0%, #7a1810 100%)",
    bodyHtml: `
      <p style="font-size:15px;line-height:1.6;color:${COLORS.ink};margin:0 0 4px;">${
        approved
          ? "✅ The school approved your request. Your book set has been updated."
          : "Unfortunately the school could not approve this change."
      }</p>
      ${detailRows([
        [approved ? "Now assigned" : "You requested", selectionHtml(args.requested)],
        ["Note from school", args.staffNote ? escapeHtml(args.staffNote) : undefined],
      ])}
      ${infoBanner({
        icon: "📍",
        bg: "#eaf1ff",
        border: "#c9dbfd",
        text: approved
          ? "Open <strong>Essentials → Books</strong> to see your updated book set. If you already bought books for the old set, please speak to the school office."
          : "If you have questions, please contact the school office.",
      })}
    `,
  });
}
