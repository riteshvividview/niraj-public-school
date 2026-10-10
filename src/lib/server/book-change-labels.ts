import type { SelectionLabels } from "@/lib/email/request-templates";

const LANGUAGE: Record<string, string> = { hindi: "Hindi", telugu: "Telugu" };
const STREAM: Record<string, string> = { science: "Science", economics: "Economics" };
const ELECTIVE: Record<string, string> = { ena: "ENA", roboticsAI: "Robotics & AI", homeScience: "Home Science" };

/** English labels for emails (the console and staff emails are English-only). */
export function selectionLabels(value: { secondLanguage?: unknown; stream?: unknown; elective?: unknown } | null | undefined): SelectionLabels {
  return {
    secondLanguage: value?.secondLanguage ? LANGUAGE[String(value.secondLanguage)] : undefined,
    stream: value?.stream ? STREAM[String(value.stream)] : undefined,
    elective: value?.elective ? ELECTIVE[String(value.elective)] : undefined,
  };
}

export const VALID_LANGUAGES = Object.keys(LANGUAGE);
export const VALID_STREAMS = Object.keys(STREAM);
export const VALID_ELECTIVES = Object.keys(ELECTIVE);
