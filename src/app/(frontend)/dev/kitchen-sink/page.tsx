"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n/context";
import { SUPPORTED_LANGUAGES } from "@/i18n/languages";
import { cn } from "@/lib/utils";

const BRAND_SWATCHES = [
  { name: "ink", className: "bg-ink" },
  { name: "sub", className: "bg-sub" },
  { name: "bg", className: "bg-background border" },
  { name: "card", className: "bg-card border" },
  { name: "line", className: "bg-line" },
  { name: "brand", className: "bg-brand" },
  { name: "brand-2", className: "bg-brand-2" },
  { name: "warm", className: "bg-warm" },
];

const SECTION_SWATCHES = [
  { name: "workspace", fg: "text-section-workspace", bg: "bg-section-workspace-bg" },
  { name: "essentials", fg: "text-section-essentials", bg: "bg-section-essentials-bg" },
  { name: "programs", fg: "text-section-programs", bg: "bg-section-programs-bg" },
  { name: "pay", fg: "text-section-pay", bg: "bg-section-pay-bg" },
  { name: "console", fg: "text-section-console", bg: "bg-section-console-bg" },
  { name: "platform", fg: "text-section-platform", bg: "bg-section-platform-bg" },
];

export default function KitchenSinkPage() {
  const { language, setLanguage, t, isReady } = useTranslation();

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-6 py-12">
      <header className="space-y-2">
        <Badge variant="secondary">Phase 1 — dev only</Badge>
        <h1 className="text-3xl font-bold text-ink">Kitchen Sink</h1>
        <p className="max-w-2xl text-sub">
          Visual proof that the brand theme, fonts, shadcn components, and the
          multilingual layer are wired up correctly before any real screens are
          built. Safe to delete once Phase 2 onward has real UI to check against.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/dev/component-gallery">View component gallery (Phase 2) →</Link>
        </Button>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">Language switcher (live)</h2>
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 pt-6">
            {SUPPORTED_LANGUAGES.map((option) => (
              <Button
                key={option.code}
                variant={language === option.code ? "default" : "outline"}
                onClick={() => setLanguage(option.code)}
              >
                {option.nativeName}
              </Button>
            ))}
          </CardContent>
        </Card>
        <div className="rounded-2xl border border-line bg-card p-6">
          <p className="text-sm text-sub">
            {isReady ? "Persisted language loaded." : "Loading persisted language…"}
          </p>
          <p className="mt-2 text-2xl font-heading font-semibold text-ink">{t.appName}</p>
          <p className="text-ink">
            {t.welcome} — {t.language}: <strong>{language}</strong>
          </p>
          <Button className="mt-4">{t.continueLabel}</Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">Fonts</h2>
        <Card>
          <CardContent className="space-y-3 pt-6">
            <p className="font-heading text-3xl font-bold text-ink">
              Poppins heading — Niraj Public School
            </p>
            <p className="font-heading text-xl font-semibold text-ink">
              Poppins subheading, weight 600
            </p>
            <p className="text-base text-ink">
              Inter body text — pay online, get a digital receipt, collect books,
              uniform and stationery at school.
            </p>
            <p className="text-sm text-sub">
              Inter secondary text at 14px, used for helper copy and metadata.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">Brand color tokens</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BRAND_SWATCHES.map((swatch) => (
            <div key={swatch.name} className="space-y-2">
              <div className={cn("h-16 rounded-2xl", swatch.className)} />
              <p className="text-sm font-medium text-ink">{swatch.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">Section accent tokens</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SECTION_SWATCHES.map((swatch) => (
            <div
              key={swatch.name}
              className={cn("flex items-center gap-3 rounded-2xl p-4", swatch.bg)}
            >
              <div className={cn("h-8 w-8 rounded-lg bg-current", swatch.fg)} />
              <p className={cn("text-sm font-semibold", swatch.fg)}>{swatch.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">shadcn/ui components</h2>
        <Card>
          <CardHeader>
            <CardTitle>Sample form card</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>Open</Badge>
              <Badge variant="secondary">Filling Fast</Badge>
              <Badge variant="destructive">Full</Badge>
              <Badge variant="outline">Paid</Badge>
            </div>
            <div className="max-w-sm space-y-2">
              <Label htmlFor="mobile">Mobile number</Label>
              <Input id="mobile" placeholder="98765 43210" />
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
