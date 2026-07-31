import type { LanguageCode, UserProfile, UserRole } from "@/types";
import { payloadCreate, payloadFind, payloadFindById } from "./payload-rest";

interface PayloadUserDoc {
  id: string;
  name: string;
  mobileNumber: string;
  role: UserRole;
  school: string;
  classLevel: string;
  preferredLanguage: LanguageCode;
  createdAt: string;
  updatedAt: string;
}

function toUserProfile(doc: PayloadUserDoc): UserProfile {
  return {
    id: doc.id,
    name: doc.name,
    mobileNumber: doc.mobileNumber,
    role: doc.role,
    schoolId: doc.school,
    classLevelId: doc.classLevel,
    preferredLanguage: doc.preferredLanguage,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function getUserProfileById(id: string): Promise<UserProfile | null> {
  const doc = await payloadFindById<PayloadUserDoc>("users", id);
  return doc ? toUserProfile(doc) : null;
}

export async function findUserByMobile(mobileNumber: string): Promise<UserProfile | null> {
  const docs = await payloadFind<PayloadUserDoc>("users", { mobileNumber });
  return docs[0] ? toUserProfile(docs[0]) : null;
}

export interface CreateUserProfileInput {
  name: string;
  mobileNumber: string;
  role: UserRole;
  schoolId: string;
  classLevelId: string;
  preferredLanguage: LanguageCode;
}

/** Registration (Phase 3) — the mock OTP session itself is unchanged; this just persists the profile record. */
export async function createUserProfile(input: CreateUserProfileInput): Promise<UserProfile> {
  const doc = await payloadCreate<PayloadUserDoc>("users", {
    name: input.name,
    mobileNumber: input.mobileNumber,
    role: input.role,
    school: input.schoolId,
    classLevel: input.classLevelId,
    preferredLanguage: input.preferredLanguage,
  });
  return toUserProfile(doc);
}
