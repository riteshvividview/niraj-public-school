import type { Program, ProgramCategory, ProgramStatus } from "@/types";
import { payloadCreate, payloadFind, payloadFindById, payloadUpdate, payloadDelete } from "./payload-rest";

interface PayloadProgramDoc {
  id: string;
  school: string;
  title: string;
  category: ProgramCategory;
  description: string;
  venue: string;
  date: string;
  fee: number;
  seatsTotal: number;
  seatsAvailable: number;
  status: ProgramStatus;
  contactPhone: string;
  imageUrl?: string | null;
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
    venue: doc.venue,
    // Payload's `date` field returns a full ISO datetime; our type/UI works
    // with plain "YYYY-MM-DD" (see formatDate/date filters) — trim it here
    // once rather than in every caller.
    date: doc.date.slice(0, 10),
    fee: doc.fee,
    seatsTotal: doc.seatsTotal,
    seatsAvailable: doc.seatsAvailable,
    status: doc.status,
    contactPhone: doc.contactPhone,
    imageUrl: doc.imageUrl ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface ProgramFilters {
  schoolId?: string;
  category?: ProgramCategory;
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
  category: ProgramCategory;
  description: string;
  venue: string;
  date: string;
  fee: number;
  seatsTotal: number;
  contactPhone: string;
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
  });
  return doc ? toProgram(doc) : null;
}

export async function setProgramStatus(id: string, status: ProgramStatus): Promise<Program | null> {
  const doc = await payloadUpdate<PayloadProgramDoc>("programs", id, { status });
  return doc ? toProgram(doc) : null;
}

export async function deleteProgram(id: string): Promise<void> {
  await payloadDelete("programs", id);
}
