/** One row of the weekly grid — a period label plus the subject taught that period on each day. */
export interface TimetablePeriod {
  label: string;
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
}

/** A freeform note/announcement block shown below the grid. */
export interface TimetableNote {
  heading: string;
  body?: string;
}

/** Mirrors the future Payload `timetables` collection — one per school + class level. */
export interface Timetable {
  id: string;
  schoolId: string;
  classLevelId: string;
  periods: TimetablePeriod[];
  notes: TimetableNote[];
  createdAt: string;
  updatedAt: string;
}
