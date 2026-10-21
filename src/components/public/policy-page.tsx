import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";

export function PolicyPage({ title, children }: { title: string; children: ReactNode }) {
  return <div className="flex min-h-dvh flex-col bg-background text-ink">
    <header className="border-b border-line bg-surface px-5 py-4"><div className="mx-auto max-w-4xl"><Link href="/login" className="text-sm font-semibold text-brand">Niraj Public School</Link></div></header>
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10 sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">School information</p>
      <h1 className="mt-2 font-heading text-3xl font-bold sm:text-4xl">{title}</h1>
      <div className="prose-school mt-8 space-y-6 text-sm leading-7 text-sub">{children}</div>
    </main>
    <SiteFooter />
  </div>;
}

export function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2 className="mb-2 text-lg font-semibold text-ink">{title}</h2>{children}</section>;
}
