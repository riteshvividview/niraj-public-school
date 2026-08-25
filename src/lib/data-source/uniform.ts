import type { Gender, UniformItem, UniformSizeOption } from "@/types";
import { payloadCreate, payloadDelete, payloadFind, payloadFindById, payloadUpdate } from "./payload-rest";

interface PayloadUniformDoc {
  id: string;
  school: string;
  classLevel: string;
  name: string;
  category: "uniform" | "kit";
  description?: string | null;
  imageUrl?: string | null;
  sizeOptions: UniformSizeOption[];
  gender?: Gender | null;
  createdAt: string;
  updatedAt: string;
}

function toUniformItem(doc: PayloadUniformDoc): UniformItem {
  return {
    id: doc.id,
    schoolId: doc.school,
    classLevelId: doc.classLevel,
    name: doc.name,
    category: doc.category,
    description: doc.description ?? undefined,
    imageUrl: doc.imageUrl ?? null,
    sizeOptions: doc.sizeOptions,
    gender: doc.gender ?? undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * `studentGender` unset (a student whose profile doesn't record it yet, or
 * a school with no gendered bundles) shows every item — same
 * unset-matches-everyone rule as getBooksByClass — rather than showing
 * nothing until staff fills gender in.
 */
export async function getUniformItemsByClass(
  schoolId: string,
  classLevelId: string,
  studentGender?: Gender,
): Promise<UniformItem[]> {
  const docs = await payloadFind<PayloadUniformDoc>("uniform-items", {
    school: schoolId,
    classLevel: classLevelId,
  });
  return docs
    .filter((doc) => doc.gender == null || studentGender == null || doc.gender === studentGender)
    .map(toUniformItem);
}

/** Console — Stock tab (whole-school view, unlike getUniformItemsByClass's per-class scoping). */
export async function getUniformItemsBySchool(schoolId: string): Promise<UniformItem[]> {
  const docs = await payloadFind<PayloadUniformDoc>("uniform-items", { school: schoolId });
  return docs.map(toUniformItem);
}

export async function getUniformItemById(id: string): Promise<UniformItem | null> {
  const doc = await payloadFindById<PayloadUniformDoc>("uniform-items", id);
  return doc ? toUniformItem(doc) : null;
}

export interface UniformItemInput {
  schoolId: string;
  classLevelId: string;
  name: string;
  category: "uniform" | "kit";
  description?: string;
  /** One row per size a student can pick (label is free text — "Standard", "S", "32", etc.), each with its own price. */
  sizeOptions: UniformSizeOption[];
  gender?: Gender;
}

/** Console — Catalogue Manager. */
export async function createUniformItem(input: UniformItemInput): Promise<UniformItem> {
  const doc = await payloadCreate<PayloadUniformDoc>("uniform-items", {
    school: input.schoolId,
    classLevel: input.classLevelId,
    name: input.name,
    category: input.category,
    description: input.description,
    sizeOptions: input.sizeOptions,
    gender: input.gender,
  });
  return toUniformItem(doc);
}

export async function updateUniformItem(
  id: string,
  patch: Partial<Omit<UniformItemInput, "schoolId" | "classLevelId">>,
): Promise<UniformItem | null> {
  const doc = await payloadUpdate<PayloadUniformDoc>("uniform-items", id, {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.category !== undefined ? { category: patch.category } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.sizeOptions !== undefined ? { sizeOptions: patch.sizeOptions } : {}),
    ...(patch.gender !== undefined ? { gender: patch.gender } : {}),
  });
  return doc ? toUniformItem(doc) : null;
}

export async function deleteUniformItem(id: string): Promise<void> {
  await payloadDelete("uniform-items", id);
}
