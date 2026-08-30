/**
 * All HTML built here is inlined-CSS/table-based, not flex/grid — email
 * clients (Gmail, Outlook) strip modern CSS, so table layout + inline
 * styles is the only reliably-rendering approach.
 */

interface EmailItemLine {
  label: string;
  meta?: string | null;
  unitPrice: number;
  quantity: number;
}

const LOGO_URL = "https://nirajpublicschool.com/wp-content/uploads/2022/06/nps-logo.png";

const COLORS = {
  ink: "#1a2130",
  sub: "#5c6472",
  bg: "#eef1f6",
  card: "#ffffff",
  line: "#e4e8f0",
  brand: "#2f6fed",
  brand2: "#0d9488",
  accent: "#e08e00",
};

function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function itemsTableHtml(items: EmailItemLine[], opts?: { struck?: boolean }): string {
  const struck = opts?.struck ?? false;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">
    ${items
      .map((item, i) => {
        const lineTotal = formatINR(item.unitPrice * item.quantity);
        return `<tr>
          <td style="padding:12px 14px;background:${i % 2 === 0 ? "#f7f9fc" : "#ffffff"};border:1px solid ${COLORS.line};border-radius:10px;${struck ? "opacity:0.6;" : ""}">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:top;">
                  <span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;background:${COLORS.brand2}1A;border-radius:6px;font-size:13px;margin-right:8px;">📦</span>
                  <span style="font-size:14px;font-weight:600;color:${COLORS.ink};${struck ? "text-decoration:line-through;" : ""}">${item.label}</span>
                  ${item.meta ? `<div style="margin:4px 0 0 30px;font-size:12px;color:${COLORS.sub};">${item.meta}</div>` : ""}
                  <div style="margin:4px 0 0 30px;font-size:12px;color:${COLORS.sub};">Qty: ${item.quantity} × ${formatINR(item.unitPrice)}</div>
                </td>
                <td style="vertical-align:top;text-align:right;white-space:nowrap;">
                  <span style="font-size:14px;font-weight:700;color:${COLORS.ink};">${lineTotal}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="height:8px;line-height:8px;font-size:0;">&nbsp;</td></tr>`;
      })
      .join("")}
  </table>`;
}

function infoBanner({ icon, bg, border, text }: { icon?: string; bg: string; border: string; text: string }): string {
  const iconCell = icon
    ? `<td style="font-size:18px;vertical-align:top;padding-right:10px;">${icon}</td>`
    : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">
    <tr>
      <td style="background:${bg};border:1px solid ${border};border-radius:12px;padding:14px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            ${iconCell}
            <td style="font-size:13px;line-height:1.6;color:${COLORS.ink};">${text}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

/**
 * Shared shell: colored gradient header behind the logo, then a white card
 * for all the detailed content, on a light gray page background — matches
 * the brand tokens in CLAUDE.md / globals.css.
 */
function wrapper({
  eyebrow,
  title,
  headerGradient,
  bodyHtml,
  footerNote,
}: {
  eyebrow: string;
  title: string;
  headerGradient: string;
  bodyHtml: string;
  footerNote?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:${COLORS.bg};font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
            <!-- Header: colored background, full-width logo banner front and center -->
            <tr>
              <td style="background:${headerGradient};border-radius:20px 20px 0 0;padding:20px 20px 22px;text-align:center;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;">
                  <tr>
                    <td style="background:#ffffff;border-radius:12px;padding:14px 16px;box-shadow:0 4px 14px rgba(0,0,0,0.12);">
                      <img src="${LOGO_URL}" alt="Niraj Public School" width="488" height="121" style="display:block;width:100%;max-width:488px;height:auto;margin:0 auto;" />
                    </td>
                  </tr>
                </table>
                <div style="margin-top:16px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.85);">${eyebrow}</div>
                <div style="margin-top:4px;font-size:22px;font-weight:800;color:#ffffff;font-family:Georgia,'Times New Roman',serif;">${title}</div>
              </td>
            </tr>
            <!-- Body: white card, all the detail lives here -->
            <tr>
              <td style="background:${COLORS.card};padding:28px 24px 8px;">
                ${bodyHtml}
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:${COLORS.card};border-radius:0 0 20px 20px;padding:8px 24px 26px;">
                ${footerNote ? `<div style="margin:8px 0 18px;font-size:12px;line-height:1.6;color:${COLORS.sub};">${footerNote}</div>` : ""}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${COLORS.line};padding-top:16px;">
                  <tr><td style="padding-top:16px;text-align:center;">
                    <img src="${LOGO_URL}" alt="Niraj Public School" width="220" height="55" style="display:block;width:100%;max-width:220px;height:auto;margin:0 auto 8px;" />
                    <div style="font-size:11px;color:${COLORS.sub};">This is an automated message from the Niraj Public School ordering platform. Please don't reply directly to this email.</div>
                  </td></tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function otpDigitsHtml(code: string): string {
  return code
    .split("")
    .map(
      (d) =>
        `<td style="width:40px;height:48px;background:${COLORS.bg};border:2px solid ${COLORS.brand};border-radius:10px;text-align:center;font-size:24px;font-weight:800;color:${COLORS.brand};font-family:'Courier New',monospace;">${d}</td>`,
    )
    .join(`<td style="width:8px;">&nbsp;</td>`);
}

export function otpEmail(code: string): string {
  return wrapper({
    eyebrow: "Account security",
    title: "Your One-Time Password",
    headerGradient: `linear-gradient(135deg, ${COLORS.brand} 0%, #1d4fc4 100%)`,
    bodyHtml: `
      <p style="font-size:15px;line-height:1.6;color:${COLORS.ink};margin:0 0 18px;">🔐 Use the code below to change your password. Enter it on the <strong>Change Password</strong> screen to continue.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 18px;">
        <tr>${otpDigitsHtml(code)}</tr>
      </table>
      <p style="text-align:center;font-size:13px;color:${COLORS.sub};margin:0 0 18px;">⏱️ This code expires in <strong>10 minutes</strong>.</p>
      ${infoBanner({
        icon: "🛡️",
        bg: "#fff7e6",
        border: "#f5deb0",
        text: `<strong>Didn't request this?</strong> Someone may have typed your email by mistake — you can safely ignore this message and your password will stay unchanged.`,
      })}
    `,
    footerNote: "For your security, never share this code with anyone — Niraj Public School staff will never ask you for it.",
  });
}

/** Console — sent by /api/console-auth/precheck when a login comes from a browser/device not already on that account's trusted list. */
export function consoleLoginOtpEmail(code: string): string {
  return wrapper({
    eyebrow: "Console security",
    title: "New Device Sign-In Code",
    headerGradient: `linear-gradient(135deg, ${COLORS.brand} 0%, #1d4fc4 100%)`,
    bodyHtml: `
      <p style="font-size:15px;line-height:1.6;color:${COLORS.ink};margin:0 0 18px;">We don't recognize this browser or device. Enter the code below to finish signing in to the School Console.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 18px;">
        <tr>${otpDigitsHtml(code)}</tr>
      </table>
      <p style="text-align:center;font-size:13px;color:${COLORS.sub};margin:0 0 18px;">This code expires in <strong>10 minutes</strong>.</p>
      ${infoBanner({
        bg: "#fde8e8",
        border: "#f3b4b4",
        text: `<strong>Wasn't you?</strong> Someone else may have your password. Ignore this email and consider asking a Console administrator to reset your access.`,
      })}
    `,
    footerNote: "For your security, never share this code with anyone — Niraj Public School staff will never ask you for it.",
  });
}

/** Console — sent by /api/console-auth/invite when an administrator adds a new staff member. */
export function consoleInviteEmail(code: string, inviterName: string, acceptUrl: string): string {
  return wrapper({
    eyebrow: "You've been invited",
    title: "School Console Access",
    headerGradient: `linear-gradient(135deg, ${COLORS.brand2} 0%, #086b60 100%)`,
    bodyHtml: `
      <p style="font-size:15px;line-height:1.6;color:${COLORS.ink};margin:0 0 18px;"><strong>${inviterName}</strong> has invited you to the Niraj Public School Console — the staff dashboard for managing the catalogue, programs, receipts, and payments.</p>
      <p style="font-size:14px;line-height:1.6;color:${COLORS.ink};margin:0 0 18px;">Click the button below, then enter the code shown here to verify your email and set up your own password:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 22px;">
        <tr>
          <td style="background:${COLORS.brand2};border-radius:10px;">
            <a href="${acceptUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Set up my account</a>
          </td>
        </tr>
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 18px;">
        <tr>${otpDigitsHtml(code)}</tr>
      </table>
      <p style="text-align:center;font-size:13px;color:${COLORS.sub};margin:0 0 18px;">This code expires in <strong>24 hours</strong>.</p>
      ${infoBanner({
        bg: "#eaf1ff",
        border: "#c9dbfd",
        text: `Button not working? Go to the Console login page and use "First time here? Activate your invite" instead — you'll still need the code above.`,
      })}
      ${infoBanner({
        bg: "#fff7e6",
        border: "#f5deb0",
        text: `Not expecting this? You can safely ignore this email — no account will be created for you.`,
      })}
    `,
    footerNote: "This Console is confidential — never share your password or a sign-in code with anyone.",
  });
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
  return wrapper({
    eyebrow: "Payment successful",
    title: "Your Order is Ready to Collect!",
    headerGradient: `linear-gradient(135deg, ${COLORS.brand2} 0%, #086b60 100%)`,
    bodyHtml: `
      <p style="font-size:15px;line-height:1.6;color:${COLORS.ink};margin:0 0 4px;">🎉 Great news! Your payment went through and your order is packed and waiting for you at the school counter.</p>
      <p style="font-size:13px;color:${COLORS.sub};margin:0 0 18px;">Show the receipt code below at the counter to collect your items.</p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
        <tr>
          <td style="background:linear-gradient(135deg,#0d948814,#0d948808);border:1.5px dashed ${COLORS.brand2};border-radius:14px;padding:18px;text-align:center;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${COLORS.brand2};margin-bottom:6px;">🎫 Receipt Code</div>
            <div style="font-size:26px;font-weight:800;letter-spacing:0.12em;color:${COLORS.ink};font-family:'Courier New',monospace;">${receiptCode}</div>
          </td>
        </tr>
      </table>

      <div style="font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${COLORS.sub};margin:20px 0 6px;">🛍️ What you ordered</div>
      ${itemsTableHtml(items)}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 20px;">
        <tr>
          <td style="background:${COLORS.ink};border-radius:12px;padding:14px 18px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:14px;color:#ffffff;font-weight:600;">💰 Total paid</td>
                <td style="text-align:right;font-size:18px;color:#ffffff;font-weight:800;">${formatINR(total)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      ${infoBanner({
        icon: "📍",
        bg: "#eaf1ff",
        border: "#c9dbfd",
        text: `<strong>How to collect:</strong> Visit the school counter during office hours and show this receipt code (as text, or the QR code in your Receipts tab) to the staff on duty. They'll hand over your items on the spot.`,
      })}
    `,
    footerNote: "Keep this email — you'll need the receipt code above until every item on it has been collected.",
  });
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
  const allDone = stillPendingItems.length === 0;
  const title = allDone ? "All Items Collected!" : "Items Collected";

  return wrapper({
    eyebrow: allDone ? "Order complete" : "Partial collection",
    title,
    headerGradient: allDone
      ? `linear-gradient(135deg, ${COLORS.brand2} 0%, #086b60 100%)`
      : `linear-gradient(135deg, ${COLORS.accent} 0%, #b56f00 100%)`,
    bodyHtml: `
      <p style="font-size:15px;line-height:1.6;color:${COLORS.ink};margin:0 0 6px;">
        ${allDone ? "✅ Everything on your order has now been collected. Thank you for shopping with us!" : "✅ Some of your items were just handed over at the counter."}
      </p>
      <p style="font-size:13px;color:${COLORS.sub};margin:0 0 18px;">Receipt code: <strong style="color:${COLORS.ink};font-family:'Courier New',monospace;">${receiptCode}</strong></p>

      <div style="font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${COLORS.brand2};margin:10px 0 6px;">✔️ Just collected</div>
      ${itemsTableHtml(justCollectedItems)}

      ${
        stillPendingItems.length > 0
          ? `<div style="font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${COLORS.accent};margin:20px 0 6px;">⏳ Still pending collection</div>
             ${itemsTableHtml(stillPendingItems, { struck: false })}
             ${infoBanner({
               icon: "📍",
               bg: "#fff7e6",
               border: "#f5deb0",
               text: `You still have items waiting at the counter. Bring the same receipt code (<strong>${receiptCode}</strong>) whenever you're ready to collect the rest.`,
             })}`
          : `${infoBanner({
              icon: "🎉",
              bg: "#eafaf3",
              border: "#bfe9d9",
              text: `This receipt is fully redeemed — nothing more to collect. See you next time!`,
            })}`
      }
    `,
  });
}
