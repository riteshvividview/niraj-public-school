import { NextResponse } from "next/server";
import { getNewAdmissionStatus, getRequiredSet } from "@/lib/server/uniform/new-admission";
import { getRequestActor, jsonError } from "@/lib/server/request-actor";

/**
 * Is this student a new admission, and have they bought their full set yet? Decided on the
 * server (register-number year, the school's academic-year start month, any staff override);
 * the Uniform page only shows what this says. `requiredIds` is the full set they must buy together.
 */
export async function GET(request: Request) {
  const actor = await getRequestActor(request);
  if (actor.kind !== "student") return jsonError("Please log in to continue.", 401);
  const status = await getNewAdmissionStatus(actor.payload, actor.user.id);
  const requiredIds = status.isNew && !status.setBought ? (await getRequiredSet(actor.payload, actor.user.id)).map((item) => item.id) : [];
  return NextResponse.json({ ...status, requiredIds });
}
