import type { Gender, UniformItem, UniformSizeOption } from "@/types";
import { payloadCreate, payloadDelete, payloadFind, payloadFindById, payloadUpdate } from "./payload-rest";

interface PayloadUniformDoc {
  id: string;
  school: string;
  /** Empty for a new-admission item (not tied to one class). */
  classLevel?: string | null;
  name: string;
  category: "uniform" | "kit";
  description?: string | null;
  imageUrl?: string | null;
  sizeOptions: UniformSizeOption[];
  gender?: Gender | null;
  newAdmission?: boolean | null;
  newAdmissionFromOrder?: number | null;
  newAdmissionToOrder?: number | null;
  retired?: boolean | null;
  createdAt: string;
  updatedAt: string;
}

function toUniformItem(doc: PayloadUniformDoc): UniformItem {
  return {
    id: doc.id,
    schoolId: doc.school,
    classLevelId: doc.classLevel ?? "",
    name: doc.name,
    category: doc.category,
    description: doc.description ?? undefined,
    imageUrl: doc.imageUrl ?? null,
    sizeOptions: doc.sizeOptions,
    gender: doc.gender ?? undefined,
    newAdmission: Boolean(doc.newAdmission),
    newAdmissionFromOrder: doc.newAdmissionFromOrder ?? undefined,
    newAdmissionToOrder: doc.newAdmissionToOrder ?? undefined,
    retired: Boolean(doc.retired),
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
    .filter((doc) => !doc.retired)
    .filter((doc) => doc.gender == null || studentGender == null || doc.gender === studentGender)
    .map(toUniformItem);
}

/**
 * The new-admission items that apply to a student of this class order (class-levels.order) and
 * gender: required for new students (part of their full set), optional for everyone else.
 * An item with no class range applies to every class.
 */
export async function getNewAdmissionItemsFor(
  schoolId: string,
  classOrder: number,
  studentGender?: Gender,
): Promise<UniformItem[]> {
  const items = await getNewAdmissionItems(schoolId);
  return items.filter(
    (item) =>
      (item.gender == null || studentGender == null || item.gender === studentGender) &&
      (item.newAdmissionFromOrder == null || classOrder >= item.newAdmissionFromOrder) &&
      (item.newAdmissionToOrder == null || classOrder <= item.newAdmissionToOrder),
  );
}

/** Console — Catalogue Manager's New Admission section (every new-admission item, whatever the class). */
export async function getNewAdmissionItems(schoolId: string): Promise<UniformItem[]> {
  const docs = await payloadFind<PayloadUniformDoc>("uniform-items", { school: schoolId, newAdmission: "true" });
  return docs.filter((doc) => !doc.retired).map(toUniformItem);
}

/** Console — Stock tab (whole-school view, unlike getUniformItemsByClass's per-class scoping). */
export async function getUniformItemsBySchool(schoolId: string): Promise<UniformItem[]> {
  const docs = await payloadFind<PayloadUniformDoc>("uniform-items", { school: schoolId });
  return docs.filter((doc) => !doc.retired).map(toUniformItem);
}

export async function getUniformItemById(id: string): Promise<UniformItem | null> {
  const doc = await payloadFindById<PayloadUniformDoc>("uniform-items", id);
  return doc ? toUniformItem(doc) : null;
}

export interface UniformItemInput {
  schoolId: string;
  /** Not needed for a new-admission item. */
  classLevelId?: string;
  newAdmission?: boolean;
  /** Take the item out of every list (kept for past orders). */
  retired?: boolean;
  newAdmissionFromOrder?: number | null;
  newAdmissionToOrder?: number | null;
  name: string;
  category: "uniform" | "kit";
  description?: string;
  /** One row per size a student can pick (label is free text — "Standard", "S", "32", etc.), each with its own price. */
  sizeOptions: UniformSizeOption[];
  /** null = for everyone (clears a previously set gender when editing). */
  gender?: Gender | null;
}

/** Console — Catalogue Manager. */
export async function createUniformItem(input: UniformItemInput): Promise<UniformItem> {
  const doc = await payloadCreate<PayloadUniformDoc>("uniform-items", {
    school: input.schoolId,
    classLevel: input.newAdmission ? undefined : input.classLevelId,
    newAdmission: input.newAdmission ?? false,
    newAdmissionFromOrder: input.newAdmission ? (input.newAdmissionFromOrder ?? null) : undefined,
    newAdmissionToOrder: input.newAdmission ? (input.newAdmissionToOrder ?? null) : undefined,
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
    ...(patch.retired !== undefined ? { retired: patch.retired } : {}),
    ...(patch.newAdmissionFromOrder !== undefined ? { newAdmissionFromOrder: patch.newAdmissionFromOrder } : {}),
    ...(patch.newAdmissionToOrder !== undefined ? { newAdmissionToOrder: patch.newAdmissionToOrder } : {}),
  });
  return doc ? toUniformItem(doc) : null;
}

export async function deleteUniformItem(id: string): Promise<void> {
  await payloadDelete("uniform-items", id);
}
