import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { RequireConsoleAuth } from "@/store/require-console-auth";
import { ConsoleMobileNav, ConsoleSidebar } from "./_components/console-nav";

export default function ConsoleDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RequireConsoleAuth>
      <SWRConfig
        value={{
          revalidateOnFocus: true,
          dedupingInterval: 15000,
        }}
      >
        <div className="flex h-dvh bg-background">
          <ConsoleSidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
            <ConsoleMobileNav />
            <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
          </div>
        </div>
      </SWRConfig>
    </RequireConsoleAuth>
  );
}
