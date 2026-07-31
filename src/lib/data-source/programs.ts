import type { Program, ProgramCategory } from "@/types";
import { MOCK_PROGRAMS } from "@/lib/mock/programs";
import { withDelay } from "./_internal";

export interface ProgramFilters {
  schoolId?: string;
  category?: ProgramCategory;
  /** Only programs on/after this ISO date. */
  dateFrom?: string;
  /** Only programs with fee <= this amount. */
  maxFee?: number;
}

export async function getPrograms(filters: ProgramFilters = {}): Promise<Program[]> {
  const results = MOCK_PROGRAMS.filter((program) => {
    if (filters.schoolId && program.schoolId !== filters.schoolId) return false;
    if (filters.category && program.category !== filters.category) return false;
    if (filters.dateFrom && program.date < filters.dateFrom) return false;
    if (filters.maxFee !== undefined && program.fee > filters.maxFee) return false;
    return true;
  }).sort((a, b) => a.date.localeCompare(b.date));

  return withDelay(results);
}

export async function getProgramById(id: string): Promise<Program | null> {
  return withDelay(MOCK_PROGRAMS.find((program) => program.id === id) ?? null);
}
