/**
 * What a parent sees INSTEAD of a blank white page while the app wakes up (the session
 * check can take a few seconds on a cold start). Pure markup + CSS — no hooks, no data —
 * so it is part of the very first HTML the server sends and shows before any JavaScript runs.
 */
export function SplashScreen() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-6">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-brand font-heading text-2xl font-bold text-white shadow-lg">N</div>
      <div className="size-7 animate-spin rounded-full border-[3px] border-line border-t-brand" aria-hidden />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
