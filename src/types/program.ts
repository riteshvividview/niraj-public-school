export type ProgramStatus = "open" | "filling-fast" | "full" | "closed";

/** Mirrors the future Payload `programs` collection. */
export interface Program {
  id: string;
  schoolId: string;
  title: string;
  /** Free text — not a fixed list, see Programs.ts. */
  category: string;
  description: string;
  venue?: string;
  /** ISO date string. */
  date: string;
  /** Fee in INR. */
  fee: number;
  seatsTotal?: number;
  seatsAvailable?: number;
  status: ProgramStatus;
  contactPhone: string;
  imageUrl: string | null;
  /** Class levels allowed to enroll — empty/unset means every grade is eligible. */
  eligibleClassLevelIds?: string[];
  createdAt: string;
  updatedAt: string;
}
