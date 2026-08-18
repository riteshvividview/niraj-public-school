import type { Program, ProgramStatus } from "@/types";
import { payloadCreate, payloadFind, payloadFindById, payloadUpdate, payloadDelete } from "./payload-rest";

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

export async function getPrograms(filters: ProgramFilters = {}): Promise<Program[]> {
  const where: Record<string, string> = {};
  if (filters.schoolId) where.school = filters.schoolId;
  if (filters.category) where.category = filters.category;

  const docs = await payloadFind<PayloadProgramDoc>("programs", where);
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

export async function getProgramById(id: string): Promise<Program | null> {
  const doc = await payloadFindById<PayloadProgramDoc>("programs", id);
  return doc ? toProgram(doc) : null;
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
  return doc ? toProgram(doc) : null;
}

export async function setProgramStatus(id: string, status: ProgramStatus): Promise<Program | null> {
  const doc = await payloadUpdate<PayloadProgramDoc>("programs", id, { status });
  return doc ? toProgram(doc) : null;
}

/** Checkout — called once per program line item on order creation. No-ops for unlimited-seat programs (seatsTotal unset). */
export async function decrementProgramSeats(programId: string): Promise<void> {
  const program = await getProgramById(programId);
  if (!program || program.seatsAvailable === undefined) return;
  await payloadUpdate("programs", programId, { seatsAvailable: Math.max(0, program.seatsAvailable - 1) });
}

export async function deleteProgram(id: string): Promise<void> {
  await payloadDelete("programs", id);
}
