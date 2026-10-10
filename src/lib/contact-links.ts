/**
 * Click-to-contact links for the console: tel: opens the phone's dialler,
 * wa.me opens WhatsApp, mailto: opens the mail app. Indian numbers are the
 * norm here, so a bare 10-digit number (or one with a leading 0) gets the
 * +91 country code; anything already carrying a country code is left alone.
 */
export function normalizePhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

export function telLink(phone: string): string {
  return `tel:+${normalizePhoneDigits(phone)}`;
}

export function whatsAppLink(phone: string, text?: string): string {
  const base = `https://wa.me/${normalizePhoneDigits(phone)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function mailtoLink(email: string, subject?: string): string {
  return subject ? `mailto:${email}?subject=${encodeURIComponent(subject)}` : `mailto:${email}`;
}

/** True for something dialable: 7–15 digits once formatting characters are stripped. */
export function isPlausiblePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}
