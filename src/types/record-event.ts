export type RecordEventActorType = "student" | "staff" | "system";

/**
 * Mirrors the Payload `record-events` collection — one line of the school's
 * permanent, append-only activity log. Student name / register number /
 * receipt code are snapshots taken when the event happened.
 */
export interface RecordEvent {
  id: string;
  eventType: string;
  entityType: string;
  entityId?: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  registerNumber?: string;
  receiptCode?: string;
  actorType: RecordEventActorType;
  actorName?: string;
  summary: string;
  details?: Record<string, unknown>;
  createdAt: string;
}
