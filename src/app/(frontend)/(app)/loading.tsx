import { PageSkeleton } from "@/components/shared/loading-skeletons";

/** Shown inside the app shell (sidebar stays) while a tab's page is still loading — never a blank screen. */
export default function Loading() {
  return <PageSkeleton />;
}
