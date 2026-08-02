import type { UserProfile } from "@/types";
import { MOCK_SCHOOL } from "./school";

const SEED_TIMESTAMP = "2026-06-01T00:00:00.000Z";

/**
 * For design/demo purposes only — Phase 3 builds the real (mocked) auth flow
 * on top of this. Not a real account store.
 */
/** Demo-only password for every seeded account — never used outside seeding. */
export const MOCK_USER_PASSWORD = "Demo@12345";

export const MOCK_USERS: UserProfile[] = [
  {
    id: "user-ritesh",
    name: "Ritesh Kumar",
    registerNumber: "NPS2026001",
    mobileNumber: "+919876500001",
    role: "student",
    schoolId: MOCK_SCHOOL.id,
    classLevelId: "class-6",
    preferredLanguage: "en",
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
  {
    id: "user-ananya",
    name: "Ananya Sharma",
    registerNumber: "NPS2026002",
    mobileNumber: "+919876500002",
    role: "student",
    schoolId: MOCK_SCHOOL.id,
    classLevelId: "class-3",
    preferredLanguage: "hi",
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  },
];
