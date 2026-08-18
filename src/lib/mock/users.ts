import type { UserProfile } from "@/types";

/** Demo-only password, kept for the (currently empty) seed-user path — see seed-payload.ts. */
export const MOCK_USER_PASSWORD = "Demo@12345";

/** No demo accounts — students are staff-imported real accounts only (see console's Bulk Upload). */
export const MOCK_USERS: UserProfile[] = [];
