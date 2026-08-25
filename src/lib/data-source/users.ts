import { oppositeLanguage } from "@/lib/academic-language";
import type {
  AcademicLanguage,
  Elective,
  Gender,
  LanguageCode,
  LanguageLevel,
  Stream,
  UserProfile,
  UserRole,
} from "@/types";
import {
  payloadCreate,
  payloadDelete,
  payloadFind,
  payloadFindById,
  payloadFindPage,
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
  avatar?: string | PayloadMediaDoc | null;
  mobileNumber?: string | null;
  email?: string | null;
  role: UserRole;
  school: string | { id: string };
  classLevel: string | { id: string };
  preferredLanguage: LanguageCode;
  section?: string | null;
  gender?: Gender | null;
  academicLanguage?: AcademicLanguage | null;
  languageLevel?: LanguageLevel | null;
  stream?: Stream | null;
  elective?: Elective | null;
  createdAt: string;
  updatedAt: string;
}

interface PayloadMediaDoc {
  id: string;
  url: string;
}

/**
 * At depth=0 (the default — see payload-rest.ts), `avatar` comes back as a
 * plain media-doc id and needs a second lookup to resolve a URL. Callers
 * that already fetched with depth=1 (e.g. getStudentsBySchool, to avoid an
 * N+1 of one media lookup per student) get `avatar` back pre-populated as a
 * full media doc, so this only makes the extra request when it's actually
 * needed — which is also why toUserProfile stays async either way.
 */
async function resolveAvatarUrl(avatar: PayloadUserDoc["avatar"]): Promise<string | undefined> {
  if (!avatar) return undefined;
  if (typeof avatar === "string") {
    const media = await payloadFindById<PayloadMediaDoc>("media", avatar);
    return media?.url ?? undefined;
  }
  return avatar.url ?? undefined;
}

/** A relationship field is a plain id string at depth=0, or a populated object at depth=1+. */
function relationId(value: string | { id: string }): string {
  return typeof value === "string" ? value : value.id;
}

async function toUserProfile(doc: PayloadUserDoc): Promise<UserProfile> {
  const avatarUrl = await resolveAvatarUrl(doc.avatar);
  return {
    id: doc.id,
    name: doc.name,
    registerNumber: doc.username,
    avatarUrl,
    mobileNumber: doc.mobileNumber ?? undefined,
    email: doc.email ?? undefined,
    role: doc.role,
    schoolId: relationId(doc.school),
    classLevelId: relationId(doc.classLevel),
    preferredLanguage: doc.preferredLanguage,
    section: doc.section ?? undefined,
    gender: doc.gender ?? undefined,
    academicLanguage: doc.academicLanguage ?? undefined,
    languageLevel: doc.languageLevel ?? undefined,
    stream: doc.stream ?? undefined,
    elective: doc.elective ?? undefined,
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
  email?: string;
  role: UserRole;
  schoolId: string;
  classLevelId: string;
  preferredLanguage?: LanguageCode;
  section?: string;
  gender?: Gender;
  academicLanguage?: AcademicLanguage;
  languageLevel?: LanguageLevel;
  stream?: Stream;
  elective?: Elective;
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
      email: input.email,
      role: input.role,
      school: input.schoolId,
      classLevel: input.classLevelId,
      preferredLanguage: input.preferredLanguage ?? "en",
      section: input.section,
      gender: input.gender,
      academicLanguage: input.academicLanguage,
      languageLevel: input.languageLevel,
      stream: input.stream,
      elective: input.elective,
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

/**
 * Console "Students" list — every portal account at this school
 * (staff-created only, no self-registration). Fetched at depth=1 so each
 * student's avatar comes back pre-populated instead of triggering a
 * separate media lookup per student (see resolveAvatarUrl).
 */
export async function getStudentsBySchool(schoolId: string): Promise<UserProfile[]> {
  const docs = await payloadFind<PayloadUserDoc>("users", { school: schoolId }, { depth: 1 });
  const sorted = [...docs].sort((a, b) => a.name.localeCompare(b.name));
  return Promise.all(sorted.map(toUserProfile));
}

export interface StudentPageFilters {
  search?: string;
  classLevelId?: string;
  section?: string;
  gender?: Gender;
  firstLanguage?: AcademicLanguage;
  secondLanguage?: AcademicLanguage;
  stream?: Stream;
  elective?: Elective;
}

export interface StudentsPage {
  students: UserProfile[];
  totalCount: number;
  totalPages: number;
  page: number;
}

/**
 * Console "Students" list, paginated + filtered server-side — the search box
 * and every filter dropdown become Payload `where` clauses instead of
 * fetching the whole roster and filtering it in the browser, so a roster of
 * any size only ever transfers one page at a time.
 */
export async function getStudentsPageBySchool(
  schoolId: string,
  filters: StudentPageFilters,
  page: number,
  pageSize = 20,
): Promise<StudentsPage> {
  const and: Record<string, unknown>[] = [{ school: { equals: schoolId } }];
  const search = filters.search?.trim();
  if (search) {
    and.push({ or: [{ name: { contains: search } }, { username: { contains: search } }] });
  }
  if (filters.classLevelId) and.push({ classLevel: { equals: filters.classLevelId } });
  if (filters.section) and.push({ section: { equals: filters.section } });
  if (filters.gender) and.push({ gender: { equals: filters.gender } });
  // First/second language are always each other's opposite (see
  // src/lib/academic-language.ts and student-shared.tsx's firstLanguageOf/
  // secondLanguageOf, which this mirrors) — a student's "first language" is
  // either an explicit academicLanguage+"first" row, or the *opposite*
  // language stored as "second" (and vice versa). Each filter must be its
  // own `or` group pushed as a single `and` entry — the previous version
  // pushed academicLanguage/languageLevel as separate top-level `and`
  // entries, so setting both filters together required academicLanguage to
  // equal two different values at once and silently matched nothing.
  // "not second" is spelled as an explicit `first OR unset` `or`, not
  // `languageLevel: { not_equals: "second" }` — SQL's `<> 'second'` is NULL
  // (i.e. excluded) for a NULL column, but an unset level should still count
  // as "first" here, matching firstLanguageOf's own default.
  const notSecond = { or: [{ languageLevel: { equals: "first" } }, { languageLevel: { exists: false } }] };
  if (filters.firstLanguage) {
    and.push({
      or: [
        { and: [{ academicLanguage: { equals: filters.firstLanguage } }, notSecond] },
        { and: [{ academicLanguage: { equals: oppositeLanguage(filters.firstLanguage) } }, { languageLevel: { equals: "second" } }] },
      ],
    });
  }
  if (filters.secondLanguage) {
    and.push({
      or: [
        { and: [{ academicLanguage: { equals: filters.secondLanguage } }, { languageLevel: { equals: "second" } }] },
        { and: [{ academicLanguage: { equals: oppositeLanguage(filters.secondLanguage) } }, notSecond] },
      ],
    });
  }
  if (filters.stream) and.push({ stream: { equals: filters.stream } });
  if (filters.elective) and.push({ elective: { equals: filters.elective } });

  const result = await payloadFindPage<PayloadUserDoc>("users", {
    where: { and },
    page,
    limit: pageSize,
    sort: "name",
    depth: 1,
  });
  const students = await Promise.all(result.docs.map(toUserProfile));
  return { students, totalCount: result.totalDocs, totalPages: result.totalPages, page: result.page };
}

/**
 * Populates the Students list's Section filter dropdown without fetching
 * full student records — `select` restricts the response to just the one
 * field, so this stays cheap even as the roster grows.
 */
export async function getStudentSectionsBySchool(schoolId: string): Promise<string[]> {
  const docs = await payloadFind<{ section?: string | null }>(
    "users",
    { school: schoolId },
    { "select[section]": "true", limit: 1000 },
  );
  return Array.from(new Set(docs.map((d) => d.section).filter((s): s is string => Boolean(s)))).sort();
}

export interface UpdateStudentInput {
  name?: string;
  mobileNumber?: string;
  email?: string;
  classLevelId?: string;
  preferredLanguage?: LanguageCode;
  section?: string;
  gender?: Gender;
  academicLanguage?: AcademicLanguage;
  languageLevel?: LanguageLevel;
  stream?: Stream;
  elective?: Elective;
}

export async function updateStudent(id: string, input: UpdateStudentInput): Promise<UserProfile> {
  const doc = await payloadUpdate<PayloadUserDoc>("users", id, {
    name: input.name,
    mobileNumber: input.mobileNumber,
    email: input.email,
    classLevel: input.classLevelId,
    preferredLanguage: input.preferredLanguage,
    section: input.section,
    gender: input.gender,
    academicLanguage: input.academicLanguage,
    languageLevel: input.languageLevel,
    stream: input.stream,
    elective: input.elective,
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
