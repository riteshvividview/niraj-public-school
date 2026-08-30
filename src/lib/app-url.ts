/**
 * Base URL for links inside transactional emails (invite, etc.). Derived
 * from the incoming request's own Host header by default — so it's
 * automatically localhost:3000 in dev and the real domain once deployed,
 * with no env var to configure or forget. NEXT_PUBLIC_APP_URL is an
 * optional override (e.g. to force a canonical domain over a preview URL).
 */
export function getAppUrl(request?: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const host = request?.headers.get("host");
  if (host) {
    const proto = request?.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return "http://localhost:3000";
}
