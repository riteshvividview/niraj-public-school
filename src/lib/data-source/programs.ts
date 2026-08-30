import type { Program, ProgramStatus } from "@/types";
import { payloadCreate, payloadFind, payloadFindById, payloadFindPage, payloadUpdate, payloadDelete } from "./payload-rest";

interface PayloadProgramDoc {
  id: string;
  school: string;
  title: string;
  category: string;
  description: string;
  venue?: string | null;
  date: string;
  fee: number;
  seatsTotal?: number | null;
  seatsAvailable?: number | null;
  status: ProgramStatus;
  contactPhone: string;
  imageUrl?: string | null;
  eligibleClassLevels?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

function toProgram(doc: PayloadProgramDoc): Program {
  return {
    id: doc.id,
    schoolId: doc.school,
    title: doc.title,
    category: doc.category,
    description: doc.description,
    venue: doc.venue ?? undefined,
    // Payload's `date` field returns a full ISO datetime; our type/UI works
    // with plain "YYYY-MM-DD" (see formatDate/date filters) — trim it here
    // once rather than in every caller.
    date: doc.date.slice(0, 10),
    fee: doc.fee,
    seatsTotal: doc.seatsTotal ?? undefined,
    seatsAvailable: doc.seatsAvailable ?? undefined,
    status: doc.status,
    contactPhone: doc.contactPhone,
    imageUrl: doc.imageUrl ?? null,
    eligibleClassLevelIds: doc.eligibleClassLevels ?? undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** Empty/unset eligibleClassLevelIds means every grade is eligible. */
export function isProgramEligibleForClass(program: Program, classLevelId: string): boolean {
  return !program.eligibleClassLevelIds?.length || program.eligibleClassLevelIds.includes(classLevelId);
}

export interface ProgramFilters {
  schoolId?: string;
  category?: string;
  /** Only programs on/after this ISO date. */
  dateFrom?: string;
  /** Only programs with fee <= this amount. */
  maxFee?: number;
}

export async function getPrograms(filters: ProgramFilters = {}, options: { limit?: number } = {}): Promise<Program[]> {
  const where: Record<string, string> = {};
  if (filters.schoolId) where.school = filters.schoolId;
  if (filters.category) where.category = filters.category;

  const extra: Record<string, string | number> = { sort: "date" };
  if (options.limit) extra.limit = options.limit;

  const docs = await payloadFind<PayloadProgramDoc>("programs", where, extra);
  const results = docs
    .map(toProgram)
    .filter((program) => {
      if (filters.dateFrom && program.date < filters.dateFrom) return false;
      if (filters.maxFee !== undefined && program.fee > filters.maxFee) return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return results;
}

/** Parent — Programs feed's category filter dropdown. Distinct categories across every school's programs (Programs & Events is the one cross-school surface — see CLAUDE.md), select-trimmed instead of a full unfiltered fetch. */
export async function getProgramCategories(): Promise<string[]> {
  const docs = await payloadFind<{ category: string }>("programs", {}, { "select[category]": "true" });
  return Array.from(new Set(docs.map((doc) => doc.category))).sort();
}

export interface ProgramPageFilters {
  category?: string;
  dateFrom?: string;
  maxFee?: number;
  /** Empty/unset eligibleClassLevels on a program means "open to every grade" — matches isProgramEligibleForClass. */
  classLevelId?: string;
}

export interface ProgramsPage {
  programs: Program[];
  totalCount: number;
  totalPages: number;
  page: number;
}

/** Parent — Programs feed, paginated + filtered server-side (mirrors getStudentsPageBySchool/getPaymentsPageBySchool's pattern). */
export async function getProgramsPage(
  filters: ProgramPageFilters,
  page: number,
  pageSize = 12,
  sort: "date" | "fee" | "-fee" = "date",
): Promise<ProgramsPage> {
  const and: Record<string, unknown>[] = [];
  if (filters.category) and.push({ category: { equals: filters.category } });
  if (filters.dateFrom) and.push({ date: { greater_than_equal: `${filters.dateFrom}T00:00:00.000Z` } });
  if (filters.maxFee !== undefined) and.push({ fee: { less_than_equal: filters.maxFee } });
  if (filters.classLevelId) {
    and.push({
      or: [{ eligibleClassLevels: { exists: false } }, { eligibleClassLevels: { in: [filters.classLevelId] } }],
    });
  }

  const result = await payloadFindPage<PayloadProgramDoc>("programs", {
    where: and.length > 0 ? { and } : undefined,
    page,
    limit: pageSize,
    sort,
  });
  return {
    programs: result.docs.map(toProgram),
    totalCount: result.totalDocs,
    totalPages: result.totalPages,
    page: result.page,
  };
}

/**
 * Read constantly (every program detail page, every receipt line, every
 * checkout line item) and only ever written by console staff — a cheap
 * in-memory memo, cleared on write, same pattern as schools.ts's
 * schoolsCache/classLevelsCache.
 */
const programCache = new Map<string, Program | null>();
const programInFlight = new Map<string, Promise<Program | null>>();

export async function getProgramById(id: string): Promise<Program | null> {
  if (programCache.has(id)) return programCache.get(id) ?? null;
  let inFlight = programInFlight.get(id);
  if (!inFlight) {
    inFlight = payloadFindById<PayloadProgramDoc>("programs", id)
      .then((doc) => (doc ? toProgram(doc) : null))
      .finally(() => {
        programInFlight.delete(id);
      });
    programInFlight.set(id, inFlight);
  }
  const program = await inFlight;
  programCache.set(id, program);
  return program;
}

export interface ProgramInput {
  schoolId: string;
  title: string;
  category: string;
  description: string;
  venue?: string;
  date: string;
  fee: number;
  seatsTotal?: number;
  contactPhone: string;
  eligibleClassLevelIds?: string[];
}

/** Console — Program Manager. */
export async function createProgram(input: ProgramInput): Promise<Program> {
  const doc = await payloadCreate<PayloadProgramDoc>("programs", {
    school: input.schoolId,
    title: input.title,
    category: input.category,
    description: input.description,
    venue: input.venue,
    date: input.date,
    fee: input.fee,
    seatsTotal: input.seatsTotal,
    seatsAvailable: input.seatsTotal,
    status: "open",
    contactPhone: input.contactPhone,
    eligibleClassLevels: input.eligibleClassLevelIds,
  });
  return toProgram(doc);
}

export async function updateProgram(id: string, patch: Partial<ProgramInput>): Promise<Program | null> {
  const doc = await payloadUpdate<PayloadProgramDoc>("programs", id, {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.category !== undefined ? { category: patch.category } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.venue !== undefined ? { venue: patch.venue } : {}),
    ...(patch.date !== undefined ? { date: patch.date } : {}),
    ...(patch.fee !== undefined ? { fee: patch.fee } : {}),
    ...(patch.contactPhone !== undefined ? { contactPhone: patch.contactPhone } : {}),
    ...(patch.eligibleClassLevelIds !== undefined ? { eligibleClassLevels: patch.eligibleClassLevelIds } : {}),
  });
  programCache.delete(id);
  return doc ? toProgram(doc) : null;
}

export async function setProgramStatus(id: string, status: ProgramStatus): Promise<Program | null> {
  const doc = await payloadUpdate<PayloadProgramDoc>("programs", id, { status });
  programCache.delete(id);
  return doc ? toProgram(doc) : null;
}

/**
 * Checkout — called once per program line item on order creation. No-ops
 * for unlimited-seat programs (seatsTotal unset). Reads `seatsAvailable`
 * directly (bypassing getProgramById's cache) since this is a read-then-
 * write on a live counter — a cached read here would only make the
 * existing (pre-existing, out of scope here) concurrent-checkout race
 * worse, not better.
 */
export async function decrementProgramSeats(programId: string): Promise<void> {
  const doc = await payloadFindById<PayloadProgramDoc>("programs", programId);
  if (!doc || doc.seatsAvailable == null) return;
  await payloadUpdate("programs", programId, { seatsAvailable: Math.max(0, doc.seatsAvailable - 1) });
  programCache.delete(programId);
}

export async function deleteProgram(id: string): Promise<void> {
  await payloadDelete("programs", id);
  programCache.delete(id);
}
