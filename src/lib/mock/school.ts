import type { ClassLevel, School } from "@/types";

const SEED_TIMESTAMP = "2026-06-01T00:00:00.000Z";

export const MOCK_SCHOOL: School = {
  id: "school-niraj",
  slug: "niraj-public-school",
  name: "Niraj Public School",
  city: "Pune",
  state: "Maharashtra",
  logoUrl: null,
  contactPhone: "+91 98765 43210",
  contactEmail: "info@nirajpublicschool.edu.in",
  createdAt: SEED_TIMESTAMP,
  updatedAt: SEED_TIMESTAMP,
};

// Real classes with data from the school's own roster/price-sheet exports
// (see School Testing Requirements/) — labeled "Class N" (the school's own
// convention). More grades are added here as the school provides data for
// them; no placeholder/demo grades.
export const CLASS_LEVELS: ClassLevel[] = [
  {
    id: "class-2",
    schoolId: MOCK_SCHOOL.id,
    label: "Class 2",
    board: "CBSE",
    order: 2,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: "class-8",
    schoolId: MOCK_SCHOOL.id,
    label: "Class 8",
    board: "CBSE",
    order: 8,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
];
