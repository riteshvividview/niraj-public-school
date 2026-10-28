import { NextResponse } from "next/server";
import { getRequestActor, jsonError } from "@/lib/server/request-actor";
import { getSelectionState, saveStudentSelection, SelectionError } from "@/lib/server/books/selection";

/**
 * Student — their book-set choice (second language / main group / secondary specialization).
 * GET: is it still changeable (not once books of this class are bought or being paid for)?
 * POST { secondLanguage?, stream?, elective? }: save it (only differences are saved and logged).
 */
export async function GET(request: Request) {
  const actor = await getRequestActor(request);
  if (actor.kind !== "student") return jsonError("Please log in to continue.", 401);
  try {
    return NextResponse.json(await getSelectionState(actor.payload, actor.user.id));
  } catch (error) {
    if (error instanceof SelectionError) return jsonError(error.message, error.status);
    console.error("[books/selection] read failed:", error);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}

export async function POST(request: Request) {
  const actor = await getRequestActor(request);
  if (actor.kind !== "student") return jsonError("Please log in to continue.", 401);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return jsonError("That request isn't valid.", 400);
  try {
    return NextResponse.json(await saveStudentSelection(actor.payload, actor.user.id, body));
  } catch (error) {
    if (error instanceof SelectionError) return jsonError(error.message, error.status);
    console.error("[books/selection] save failed:", error);
    return jsonError("We couldn't save your choice. Nothing was changed.", 500);
  }
}
