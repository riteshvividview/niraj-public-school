import type { ReactNode } from "react";
import { RequireAuth } from "@/store/require-auth";
import { AppBottomNav } from "./_components/app-bottom-nav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-dvh flex-col">
        <div className="flex-1">{children}</div>
        <AppBottomNav />
      </div>
    </RequireAuth>
  );
}
