import { NextResponse } from "next/server";
import { eventActor } from "@/lib/server/record-events";
import { getRequestActor, jsonError } from "@/lib/server/request-actor";
import { ClassChangeError, changeClass } from "@/lib/server/students/change-class";

/**
 * Staff — move one student, or a whole class, to another class (promote, or move back for a student who
 * stays in the year). Body: { studentIds: string[], fromClassLevelId, toClassLevelId, note? }.
 * Only students currently in `fromClassLevelId` are moved. Book sets and uniform kits are not touched.
 */
export async function POST(request: Request) {
  const actor = await getRequestActor(request);
  if (actor.kind !== "staff") return jsonError("Only school staff can change a student's class.", 403);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return jsonError("That request isn't valid.", 400);
  try {
    const result = await changeClass(actor.payload, eventActor(actor), {
      studentIds: body.studentIds,
      fromClassLevelId: body.fromClassLevelId,
      toClassLevelId: body.toClassLevelId,
      note: body.note,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ClassChangeError) return jsonError(error.message, error.status);
    console.error("[students/class] failed:", error);
    return jsonError("We couldn't move the students. Nothing was changed.", 500);
  }
}
