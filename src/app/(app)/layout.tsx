import type { ReactNode } from "react";
import { RequireAuth } from "@/store/require-auth";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
