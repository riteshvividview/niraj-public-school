import type { LanguageCode, UserProfile, UserRole } from "@/types";
import {
  payloadCreate,
  payloadDelete,
  payloadFind,
  payloadFindById,
  payloadLogin,
  payloadLogout,
  payloadMe,
  payloadUpdate,
  payloadUploadFile,
} from "./payload-rest";

interface PayloadUserDoc {
  id: string;
  name: string;
  username: string;
  avatar?: string | null;
  mobileNumber?: string | null;
  role: UserRole;
  school: string;
  classLevel: string;
  preferredLanguage: LanguageCode;
  createdAt: string;
  updatedAt: string;
}

interface PayloadMediaDoc {
  id: string;
  url: string;
}

/**
 * `avatar` comes back as a plain media-doc id (depth=0, same as every other
 * relationship field — see payload-rest.ts). A second lookup resolves it to
 * an actual URL; this is why toUserProfile is async, unlike the other
 * data-source mappers in this folder.
 */
async function toUserProfile(doc: PayloadUserDoc): Promise<UserProfile> {
  const avatarUrl = doc.avatar ? await payloadFindById<PayloadMediaDoc>("media", doc.avatar) : null;
  return {
    id: doc.id,
    name: doc.name,
    registerNumber: doc.username,
    avatarUrl: avatarUrl?.url ?? undefined,
    mobileNumber: doc.mobileNumber ?? undefined,
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

/** Reads the current session from the browser's auth cookie — null if not logged in. */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const doc = await payloadMe<PayloadUserDoc>("users");
  return doc ? toUserProfile(doc) : null;
}

export async function loginUser(registerNumber: string, password: string): Promise<UserProfile> {
  const doc = await payloadLogin<PayloadUserDoc>("users", { username: registerNumber, password });
  return toUserProfile(doc);
}

export async function logoutUser(): Promise<void> {
  await payloadLogout("users");
}

/** Uploads the file to Media, points the user's avatar at it, and returns the refreshed profile. */
export async function updateUserAvatar(userId: string, file: File): Promise<UserProfile> {
  const media = await payloadUploadFile<PayloadMediaDoc>("media", file);
  const doc = await payloadUpdate<PayloadUserDoc>("users", userId, { avatar: media.id });
  return toUserProfile(doc);
}

export interface CreateStudentInput {
  name: string;
  registerNumber: string;
  password: string;
  mobileNumber?: string;
  role: UserRole;
  schoolId: string;
  classLevelId: string;
  preferredLanguage?: LanguageCode;
}

/**
 * Payload's own field is `username` (see Users.ts), but this app never shows
 * that word to a user — every label says "register number." Rewrites the
 * one string that would otherwise leak it: Payload's validation error on a
 * duplicate/missing username.
 */
function toRegisterNumberError(error: unknown): Error {
  if (error instanceof Error) {
    return new Error(error.message.replace(/\busername\b/gi, "register number"));
  }
  return new Error("Couldn't save this student.");
}

/** Staff-driven account creation (console "Add Student" / bulk import) — no self-registration in this app. */
export async function createStudent(input: CreateStudentInput): Promise<UserProfile> {
  try {
    const doc = await payloadCreate<PayloadUserDoc>("users", {
      name: input.name,
      username: input.registerNumber,
      password: input.password,
      mobileNumber: input.mobileNumber,
      role: input.role,
      school: input.schoolId,
      classLevel: input.classLevelId,
      preferredLanguage: input.preferredLanguage ?? "en",
    });
    return toUserProfile(doc);
  } catch (error) {
    throw toRegisterNumberError(error);
  }
}

export interface BulkCreateResult {
  row: number;
  registerNumber: string;
  ok: boolean;
  error?: string;
}

/**
 * Sequential, not parallel — Payload validates `username` uniqueness against
 * the database per-request, so firing 100 creates at once risks duplicate
 * register numbers within the same batch racing past each other. Returns a
 * per-row result so the console can show exactly which rows failed and why.
 */
export async function bulkCreateStudents(inputs: CreateStudentInput[]): Promise<BulkCreateResult[]> {
  const results: BulkCreateResult[] = [];
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    try {
      await createStudent(input);
      results.push({ row: i + 1, registerNumber: input.registerNumber, ok: true });
    } catch (error) {
      results.push({
        row: i + 1,
        registerNumber: input.registerNumber,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  return results;
}

/** Console "Students" list — every portal account at this school (staff-created only, no self-registration). */
export async function getStudentsBySchool(schoolId: string): Promise<UserProfile[]> {
  const docs = await payloadFind<PayloadUserDoc>("users", { school: schoolId });
  const sorted = [...docs].sort((a, b) => a.name.localeCompare(b.name));
  return Promise.all(sorted.map(toUserProfile));
}

export interface UpdateStudentInput {
  name?: string;
  mobileNumber?: string;
  classLevelId?: string;
  preferredLanguage?: LanguageCode;
}

export async function updateStudent(id: string, input: UpdateStudentInput): Promise<UserProfile> {
  const doc = await payloadUpdate<PayloadUserDoc>("users", id, {
    name: input.name,
    mobileNumber: input.mobileNumber,
    classLevel: input.classLevelId,
    preferredLanguage: input.preferredLanguage,
  });
  return toUserProfile(doc);
}

/** Staff resetting a student's forgotten password — there's no self-service "forgot password" flow in this app. */
export async function resetStudentPassword(id: string, newPassword: string): Promise<void> {
  await payloadUpdate("users", id, { password: newPassword });
}

export async function deleteStudent(id: string): Promise<void> {
  await payloadDelete("users", id);
}
