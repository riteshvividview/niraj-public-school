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

export const MOCK_CLASS_LEVELS: ClassLevel[] = [
  {
    id: "class-1",
    schoolId: MOCK_SCHOOL.id,
    label: "Grade 1",
    board: "CBSE",
    order: 1,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: "class-3",
    schoolId: MOCK_SCHOOL.id,
    label: "Grade 3",
    board: "CBSE",
    order: 3,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: "class-6",
    schoolId: MOCK_SCHOOL.id,
    label: "Grade 6",
    board: "CBSE",
    order: 6,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: "class-9",
    schoolId: MOCK_SCHOOL.id,
    label: "Grade 9",
    board: "CBSE",
    order: 9,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
];
