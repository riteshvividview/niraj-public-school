import type { ReactNode } from "react";
import { SiteFooter } from "@/components/public/site-footer";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-background">{children}<SiteFooter /></div>;
}
