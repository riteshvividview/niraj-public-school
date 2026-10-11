import { createHash } from "node:crypto";
import type { Payload } from "payload";
import { assignedBookSetOf, bookMatchesAssignedSet } from "@/lib/book-set";
import { relId } from "@/lib/server/request-actor";
import type { PaymentItem, PaymentKind } from "./types";

/**
 * Server-only. The browser tells us WHAT it wants (kind + id [+ size]) — never
 * what it costs. Every line is re-read from the catalogue here, checked against
 * this student (class, assigned book set, gender, program eligibility / seats /
 * already-registered), and priced from the database. A forged cart cannot change
 * a price or buy something the student isn't entitled to.
 */
export interface RequestedLine {
  kind: PaymentKind;
  refId: string;
  /** Uniform: the size. Ignored for everything else. */
  meta?: string;
}

export class CartError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const LANGUAGE_LABELS: Record<string, string> = { hindi: "Hindi", telugu: "Telugu" };
const STREAM_LABELS: Record<string, string> = { science: "Science", economics: "Economics" };
const ELECTIVE_LABELS: Record<string, string> = { ena: "ENA", homeScience: "Home Science", roboticsAI: "Robotics & AI" };

const MAX_LINES = 30;

type Doc = Record<string, unknown>;

export async function priceCart(payload: Payload, studentId: string, requested: RequestedLine[]): Promise<{ items: PaymentItem[]; total: number }> {
  if (!Array.isArray(requested) || requested.length === 0) throw new CartError("Your cart is empty.");
  if (requested.length > MAX_LINES) throw new CartError("Too many items in the cart.");

  const student = (await payload.findByID({ collection: "users", id: studentId, depth: 0 })) as unknown as Doc;
  const schoolId = relId(student.school);
  const classLevelId = relId(student.classLevel);
  const assigned = assignedBookSetOf({
    academicLanguage: (student.academicLanguage as never) ?? undefined,
    languageLevel: (student.languageLevel as never) ?? undefined,
    stream: (student.stream as never) ?? undefined,
    elective: (student.elective as never) ?? undefined,
  });

  const seen = new Set<string>();
  const items: PaymentItem[] = [];
  for (const line of requested) {
    if (!line || !["book", "uniform", "program"].includes(line.kind) || typeof line.refId !== "string" || !line.refId) {
      throw new CartError("Something in your cart isn't valid. Please review your cart.");
    }
    const key = `${line.kind}:${line.refId}`;
    if (seen.has(key)) throw new CartError("The same item is in your cart twice. Please review your cart.");
    seen.add(key);

    if (line.kind === "book") {
      const book = (await payload.findByID({ collection: "books", id: line.refId, depth: 0 }).catch(() => null)) as Doc | null;
      const gone = new CartError("A book in your cart is no longer available. Please review your cart.");
      if (!book || relId(book.school) !== schoolId || relId(book.classLevel) !== classLevelId) throw gone;
      if (!bookMatchesAssignedSet(book as { language?: string | null; stream?: string | null; elective?: string | null }, assigned)) {
        throw new CartError("Your cart has books that don't match the book set assigned to you. Please reopen Essentials → Books and review your cart.");
      }
      const meta = [
        book.subject,
        book.language && LANGUAGE_LABELS[String(book.language)],
        book.stream && STREAM_LABELS[String(book.stream)],
        book.elective && ELECTIVE_LABELS[String(book.elective)],
      ]
        .filter(Boolean)
        .join(" · ");
      items.push({ kind: "book", refId: line.refId, label: String(book.title), meta: meta || undefined, unitPrice: Number(book.price), quantity: 1 });
    } else if (line.kind === "uniform") {
      const item = (await payload.findByID({ collection: "uniform-items", id: line.refId, depth: 0 }).catch(() => null)) as Doc | null;
      const gone = new CartError("A uniform item in your cart is no longer available. Please review your cart.");
      if (!item || relId(item.school) !== schoolId || relId(item.classLevel) !== classLevelId) throw gone;
      if (item.gender && student.gender && item.gender !== student.gender) throw gone;
      const size = (item.sizeOptions as Array<{ size: string; price: number }> | undefined)?.find((option) => option.size === line.meta);
      if (!size) throw new CartError(`The size you chose for ${String(item.name)} is no longer available. Please review your cart.`);
      items.push({ kind: "uniform", refId: line.refId, label: String(item.name), meta: size.size, unitPrice: Number(size.price), quantity: 1 });
    } else {
      const program = (await payload.findByID({ collection: "programs", id: line.refId, depth: 0 }).catch(() => null)) as Doc | null;
      if (!program || relId(program.school) !== schoolId) throw new CartError("A program in your cart is no longer available. Please review your cart.");
      const title = String(program.title);
      if (program.status === "full" || program.status === "closed" || (program.seatsAvailable != null && Number(program.seatsAvailable) <= 0)) {
        throw new CartError(`${title} is no longer taking registrations.`, 409);
      }
      const eligible = (program.eligibleClassLevels as unknown[] | undefined)?.map(relId) ?? [];
      if (eligible.length > 0 && !eligible.includes(classLevelId)) throw new CartError(`${title} isn't open to your class.`, 403);
      const already = await payload.find({
        collection: "orders",
        where: { and: [{ user: { equals: studentId } }, { status: { equals: "paid" } }, { "items.refId": { equals: line.refId } }] },
        limit: 1,
        depth: 0,
      });
      if (already.docs.length > 0) throw new CartError(`You are already registered for ${title}.`, 409);
      items.push({
        kind: "program",
        refId: line.refId,
        label: title,
        meta: new Date(String(program.date)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        unitPrice: Number(program.fee),
        quantity: 1,
      });
    }
  }

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  if (!(total > 0)) throw new CartError("There is nothing to pay for in this cart.");
  return { items, total };
}

/**
 * Identifies "the same purchase" for the duplicate check. Uniform size matters
 * (a different size is a different purchase); a book set or program is the same
 * wherever it was bought from, so only kind + id count there.
 */
export function fingerprintOf(items: Array<Pick<PaymentItem, "kind" | "refId" | "meta" | "quantity">>): string {
  const parts = items
    .map((item) => `${item.kind}:${item.refId}:${item.kind === "uniform" ? (item.meta ?? "") : ""}:${item.quantity}`)
    .sort();
  return createHash("sha1").update(parts.join("|")).digest("hex");
}
