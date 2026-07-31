import { sizesFor } from "@/lib/mock/uniform";
import type { UniformItem, UniformSizeOption } from "@/types";
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
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function getUniformItemsByClass(
  schoolId: string,
  classLevelId: string,
): Promise<UniformItem[]> {
  const docs = await payloadFind<PayloadUniformDoc>("uniform-items", {
    school: schoolId,
    classLevel: classLevelId,
  });
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
  /** Price for the smallest size — the console only collects a single base price; per-size pricing stays generated the same way the seed data is. */
  basePrice: number;
}

/** Console — Catalogue Manager. */
export async function createUniformItem(input: UniformItemInput): Promise<UniformItem> {
  const doc = await payloadCreate<PayloadUniformDoc>("uniform-items", {
    school: input.schoolId,
    classLevel: input.classLevelId,
    name: input.name,
    category: input.category,
    description: input.description,
    sizeOptions: sizesFor(input.classLevelId, input.basePrice),
  });
  return toUniformItem(doc);
}

export async function updateUniformItem(
  id: string,
  patch: Partial<Omit<UniformItemInput, "schoolId" | "classLevelId">>,
): Promise<UniformItem | null> {
  const { basePrice, ...rest } = patch;
  let sizeOptions: UniformSizeOption[] | undefined;
  if (basePrice !== undefined) {
    const existing = await getUniformItemById(id);
    if (existing) sizeOptions = sizesFor(existing.classLevelId, basePrice);
  }
  const doc = await payloadUpdate<PayloadUniformDoc>("uniform-items", id, {
    ...(rest.name !== undefined ? { name: rest.name } : {}),
    ...(rest.category !== undefined ? { category: rest.category } : {}),
    ...(rest.description !== undefined ? { description: rest.description } : {}),
    ...(sizeOptions ? { sizeOptions } : {}),
  });
  return doc ? toUniformItem(doc) : null;
}

export async function deleteUniformItem(id: string): Promise<void> {
  await payloadDelete("uniform-items", id);
}
