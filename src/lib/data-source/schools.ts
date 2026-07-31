import type { ClassLevel, School } from "@/types";
import { payloadFind, payloadFindById } from "./payload-rest";

interface PayloadSchoolDoc {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  logoUrl?: string | null;
  contactPhone: string;
  contactEmail: string;
  createdAt: string;
  updatedAt: string;
}

interface PayloadClassLevelDoc {
  id: string;
  school: string;
  label: string;
  board: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

function toSchool(doc: PayloadSchoolDoc): School {
  return {
    id: doc.id,
    name: doc.name,
    slug: doc.slug,
    city: doc.city,
    state: doc.state,
    logoUrl: doc.logoUrl ?? null,
    contactPhone: doc.contactPhone,
    contactEmail: doc.contactEmail,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toClassLevel(doc: PayloadClassLevelDoc): ClassLevel {
  return {
    id: doc.id,
    schoolId: doc.school,
    label: doc.label,
    board: doc.board,
    order: doc.order,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** Only one seed school today — registration's school picker is still a real list/select so adding more is a data change, not a UI rewrite. */
export async function getSchools(): Promise<School[]> {
  const docs = await payloadFind<PayloadSchoolDoc>("schools");
  return docs.map(toSchool);
}

export async function getSchoolBySlug(slug: string): Promise<School | null> {
  const docs = await payloadFind<PayloadSchoolDoc>("schools", { slug });
  return docs[0] ? toSchool(docs[0]) : null;
}

export async function getSchoolById(id: string): Promise<School | null> {
  const doc = await payloadFindById<PayloadSchoolDoc>("schools", id);
  return doc ? toSchool(doc) : null;
}

export async function getClassLevelsBySchool(schoolId: string): Promise<ClassLevel[]> {
  const docs = await payloadFind<PayloadClassLevelDoc>("class-levels", { school: schoolId });
  return docs.map(toClassLevel).sort((a, b) => a.order - b.order);
}

export async function getClassLevelById(id: string): Promise<ClassLevel | null> {
  const doc = await payloadFindById<PayloadClassLevelDoc>("class-levels", id);
  return doc ? toClassLevel(doc) : null;
}
