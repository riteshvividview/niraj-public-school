import type { ReactNode } from "react";
import { RequireAuth } from "@/store/require-auth";
import { AppBottomNav } from "./_components/app-bottom-nav";
import { AppSidebar } from "./_components/app-sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-dvh flex-col md:flex-row">
        <AppSidebar />
        <div className="flex min-h-dvh flex-1 flex-col md:min-h-dvh">
          <div className="flex-1">{children}</div>
          <AppBottomNav />
        </div>
      </div>
    </RequireAuth>
  );
}
