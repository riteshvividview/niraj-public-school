import { CATEGORY_PREFIXES, type RecordEventCategory } from "@/lib/record-events";
import type { RecordEvent, RecordEventActorType } from "@/types";
import { payloadFind, payloadFindPage } from "./payload-rest";

interface PayloadRecordEventDoc {
  id: string;
  eventType: string;
  entityType: string;
  entityId?: string | null;
  school: string;
  student: string;
  studentName: string;
  registerNumber?: string | null;
  receiptCode?: string | null;
  actorType: RecordEventActorType;
  actorName?: string | null;
  summary: string;
  details?: Record<string, unknown> | null;
  createdAt: string;
}

function toEvent(doc: PayloadRecordEventDoc): RecordEvent {
  return {
    id: doc.id,
    eventType: doc.eventType,
    entityType: doc.entityType,
    entityId: doc.entityId ?? undefined,
    schoolId: doc.school,
    studentId: doc.student,
    studentName: doc.studentName,
    registerNumber: doc.registerNumber ?? undefined,
    receiptCode: doc.receiptCode ?? undefined,
    actorType: doc.actorType,
    actorName: doc.actorName ?? undefined,
    summary: doc.summary,
    details: doc.details ?? undefined,
    createdAt: doc.createdAt,
  };
}

export interface RecordFilters {
  search?: string;
  category?: RecordEventCategory;
  studentId?: string;
  fromDate?: string;
  toDate?: string;
}

function buildWhere(schoolId: string, filters: RecordFilters): Record<string, unknown> {
  const and: Record<string, unknown>[] = [{ school: { equals: schoolId } }];
  if (filters.studentId) and.push({ student: { equals: filters.studentId } });
  if (filters.category) {
    and.push({ or: CATEGORY_PREFIXES[filters.category].map((prefix) => ({ eventType: { contains: prefix } })) });
  }
  const search = filters.search?.trim();
  if (search) {
    and.push({
      or: [
        { studentName: { contains: search } },
        { registerNumber: { contains: search } },
        { receiptCode: { contains: search.toUpperCase() } },
        { summary: { contains: search } },
        { actorName: { contains: search } },
      ],
    });
  }
  if (filters.fromDate) and.push({ createdAt: { greater_than_equal: `${filters.fromDate}T00:00:00.000Z` } });
  if (filters.toDate) and.push({ createdAt: { less_than_equal: `${filters.toDate}T23:59:59.999Z` } });
  return { and };
}

export interface RecordEventsPage {
  events: RecordEvent[];
  totalCount: number;
  totalPages: number;
  page: number;
}

/** Console — Records & History, filtered + paginated server-side, newest first. */
export async function getRecordEventsPageBySchool(
  schoolId: string,
  filters: RecordFilters,
  page: number,
  pageSize = 30,
): Promise<RecordEventsPage> {
  const result = await payloadFindPage<PayloadRecordEventDoc>("record-events", {
    where: buildWhere(schoolId, filters),
    page,
    limit: pageSize,
    sort: "-createdAt",
  });
  return { events: result.docs.map(toEvent), totalCount: result.totalDocs, totalPages: result.totalPages, page: result.page };
}

/** Console — every event matching the filters, for CSV export. */
export async function getAllRecordEventsBySchool(schoolId: string, filters: RecordFilters): Promise<RecordEvent[]> {
  const result = await payloadFindPage<PayloadRecordEventDoc>("record-events", {
    where: buildWhere(schoolId, filters),
    page: 1,
    limit: 10000,
    sort: "-createdAt",
  });
  return result.docs.map(toEvent);
}

/** Console — one student's full timeline (their detail page), newest first. */
export async function getRecordEventsByStudent(studentId: string, limit = 100): Promise<RecordEvent[]> {
  const docs = await payloadFind<PayloadRecordEventDoc>("record-events", { student: studentId }, { sort: "-createdAt", limit });
  return docs.map(toEvent);
}
