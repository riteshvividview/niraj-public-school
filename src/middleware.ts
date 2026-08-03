import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Payload uses one project-wide cookie name (`payload-token`) for every
 * auth collection — there's no supported per-collection override (confirmed
 * by reading Payload's own source; see .claude/DECISIONS.md's "single
 * global cookie name" entry). That means a browser signed into the parent
 * app (`users` collection, via /login) carries a `payload-token` cookie
 * that /admin's own logout button can't clear: Payload's logout operation
 * rejects a session whose collection doesn't match the one being logged
 * out of (`payload-admins`), so clicking "Log out" on /admin's Unauthorized
 * screen (which navigates to the `/admin/logout` page — confirmed via
 * live network trace, not a REST call to /api/payload-admins/logout as
 * originally assumed) silently fails server-side and loops back to the
 * same Unauthorized screen on the next visit.
 *
 * This middleware doesn't touch Payload's logout logic — it just always
 * force-expires the shared cookie on any request to /admin/logout,
 * regardless of whether Payload's own Local-API call inside that page
 * succeeds or throws on that same request. Cookies set here are merged
 * into whatever response the route eventually returns.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  if (request.nextUrl.pathname === "/admin/logout") {
    response.cookies.set("payload-token", "", { expires: new Date(0), path: "/" });
  }
  return response;
}

export const config = {
  matcher: "/admin/logout",
};
