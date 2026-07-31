import type { Program, ProgramCategory, ProgramStatus } from "@/types";
import { MOCK_PROGRAMS } from "@/lib/mock/programs";
import { createRuntimeCollection, withDelay } from "./_internal";

const store = createRuntimeCollection<Program>("nps-runtime-programs", MOCK_PROGRAMS);

export interface ProgramFilters {
  schoolId?: string;
  category?: ProgramCategory;
  /** Only programs on/after this ISO date. */
  dateFrom?: string;
  /** Only programs with fee <= this amount. */
  maxFee?: number;
}

export async function getPrograms(filters: ProgramFilters = {}): Promise<Program[]> {
  const results = store
    .all()
    .filter((program) => {
      if (filters.schoolId && program.schoolId !== filters.schoolId) return false;
      if (filters.category && program.category !== filters.category) return false;
      if (filters.dateFrom && program.date < filters.dateFrom) return false;
      if (filters.maxFee !== undefined && program.fee > filters.maxFee) return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return withDelay(results);
}

export async function getProgramById(id: string): Promise<Program | null> {
  return withDelay(store.find(id) ?? null);
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

/** Console — Program Manager. In Phase 9 this becomes a write to the Payload `programs` collection. */
export async function createProgram(input: ProgramInput): Promise<Program> {
  const now = new Date().toISOString();
  const program: Program = {
    id: `program-${Date.now()}`,
    imageUrl: null,
    seatsAvailable: input.seatsTotal,
    status: "open",
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  store.add(program);
  return withDelay(program);
}

export async function updateProgram(id: string, patch: Partial<ProgramInput>): Promise<Program | null> {
  return withDelay(store.update(id, { ...patch, updatedAt: new Date().toISOString() }));
}

export async function setProgramStatus(id: string, status: ProgramStatus): Promise<Program | null> {
  return withDelay(store.update(id, { status, updatedAt: new Date().toISOString() }));
}

export async function deleteProgram(id: string): Promise<void> {
  store.remove(id);
  return withDelay(undefined);
}
