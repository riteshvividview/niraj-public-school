interface EmailItemLine {
  label: string;
  meta?: string | null;
  unitPrice: number;
  quantity: number;
}

function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function itemsListHtml(items: EmailItemLine[]): string {
  return `<ul style="padding-left:18px;margin:12px 0;">${items
    .map(
      (item) =>
        `<li style="margin-bottom:6px;">${item.label}${item.meta ? ` <span style="color:#5c6472;">(${item.meta})</span>` : ""} — ${formatINR(item.unitPrice * item.quantity)}</li>`,
    )
    .join("")}</ul>`;
}

function wrapper(title: string, bodyHtml: string): string {
  return `<div style="font-family:Arial,sans-serif;color:#1a2130;max-width:480px;margin:0 auto;">
    <h2 style="color:#2f6fed;">${title}</h2>
    ${bodyHtml}
    <p style="margin-top:24px;font-size:12px;color:#5c6472;">Niraj Public School</p>
  </div>`;
}

export function otpEmail(code: string): string {
  return wrapper(
    "Your one-time password",
    `<p>Use the code below to change your password. It expires in 10 minutes.</p>
     <p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:16px 0;">${code}</p>
     <p style="font-size:13px;color:#5c6472;">If you didn't request this, you can ignore this email.</p>`,
  );
}

export function readyToCollectEmail({
  receiptCode,
  items,
  total,
}: {
  receiptCode: string;
  items: EmailItemLine[];
  total: number;
}): string {
  return wrapper(
    "Your order is ready to collect",
    `<p>Your payment was successful. Show this receipt code at the school counter to collect your items:</p>
     <p style="font-size:22px;font-weight:bold;letter-spacing:2px;margin:12px 0;">${receiptCode}</p>
     ${itemsListHtml(items)}
     <p><strong>Total: ${formatINR(total)}</strong></p>`,
  );
}

export function collectedEmail({
  receiptCode,
  justCollectedItems,
  stillPendingItems,
}: {
  receiptCode: string;
  justCollectedItems: EmailItemLine[];
  stillPendingItems: EmailItemLine[];
}): string {
  const title = stillPendingItems.length === 0 ? "All items collected" : "Items collected";
  return wrapper(
    title,
    `<p>Receipt <strong>${receiptCode}</strong> — the following item${justCollectedItems.length === 1 ? " has" : "s have"} just been collected:</p>
     ${itemsListHtml(justCollectedItems)}
     ${
       stillPendingItems.length > 0
         ? `<p>Still pending collection:</p>${itemsListHtml(stillPendingItems)}`
         : `<p>Everything on this receipt has now been collected. Thank you!</p>`
     }`,
  );
}
