import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-heading text-2xl font-bold text-ink">Niraj Public School</h1>
      <p className="max-w-md text-sub">
        The real language selector / login flow is built in Phase 3. For now, check the
        design system foundation from Phase 1.
      </p>
      <Button asChild>
        <Link href="/dev/kitchen-sink">View kitchen sink</Link>
      </Button>
    </main>
  );
}
