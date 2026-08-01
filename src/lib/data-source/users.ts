import type { LanguageCode, UserProfile, UserRole } from "@/types";
import {
  payloadCreate,
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
  email: string;
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
    email: doc.email,
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

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
  mobileNumber?: string;
  role: UserRole;
  schoolId: string;
  classLevelId: string;
  preferredLanguage: LanguageCode;
}

/** Creates the account, then logs in immediately (Payload's create endpoint doesn't set a session on its own). */
export async function registerUser(input: RegisterUserInput): Promise<UserProfile> {
  await payloadCreate<PayloadUserDoc>("users", {
    name: input.name,
    email: input.email,
    password: input.password,
    mobileNumber: input.mobileNumber,
    role: input.role,
    school: input.schoolId,
    classLevel: input.classLevelId,
    preferredLanguage: input.preferredLanguage,
  });
  return loginUser(input.email, input.password);
}

export async function loginUser(email: string, password: string): Promise<UserProfile> {
  const doc = await payloadLogin<PayloadUserDoc>("users", { email, password });
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
