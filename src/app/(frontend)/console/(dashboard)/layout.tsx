import type { ReactNode } from "react";
import { RequireConsoleAuth } from "@/store/require-console-auth";
import { ConsoleMobileNav, ConsoleSidebar } from "./_components/console-nav";

export default function ConsoleDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RequireConsoleAuth>
      <div className="flex min-h-dvh bg-background">
        <ConsoleSidebar />
        <div className="flex flex-1 flex-col">
          <ConsoleMobileNav />
          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>
    </RequireConsoleAuth>
  );
}
