/** Mirrors the future Payload `schools` collection. */
export interface School {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  logoUrl: string | null;
  contactPhone: string;
  contactEmail: string;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors the future Payload `class-levels` collection. */
export interface ClassLevel {
  id: string;
  schoolId: string;
  label: string;
  board: string;
  /** Sort order, e.g. Grade 1 = 1, Grade 12 = 12. */
  order: number;
  createdAt: string;
  updatedAt: string;
}
