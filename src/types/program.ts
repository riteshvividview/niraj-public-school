export type ProgramCategory =
  | "workshop"
  | "sports"
  | "camp"
  | "annual-day"
  | "exhibition"
  | "extra-class";

export type ProgramStatus = "open" | "filling-fast" | "full" | "closed";

/** Mirrors the future Payload `programs` collection. */
export interface Program {
  id: string;
  schoolId: string;
  title: string;
  category: ProgramCategory;
  description: string;
  venue: string;
  /** ISO date string. */
  date: string;
  /** Fee in INR. */
  fee: number;
  seatsTotal: number;
  seatsAvailable: number;
  status: ProgramStatus;
  contactPhone: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
