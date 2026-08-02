"use client";

import {
  BookOpen,
  Calendar,
  Home,
  Inbox,
  Receipt,
  Shirt,
  ShoppingBag,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/shared/app-header";
import { BottomNav, type BottomNavTab } from "@/components/shared/bottom-nav";
import { EmptyState } from "@/components/shared/empty-state";
import { ItemCard } from "@/components/shared/item-card";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import {
  ItemCardSkeleton,
  ProgramCardSkeleton,
  ReceiptCardSkeleton,
} from "@/components/shared/loading-skeletons";
import { PriceSummary } from "@/components/shared/price-summary";
import { ProgramCard } from "@/components/shared/program-card";
import { ReceiptCard } from "@/components/shared/receipt-card";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge, type BadgeStatus } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { getBooksByClass, getPrograms } from "@/lib/data-source";
import { useTranslation } from "@/i18n/context";
import type { Book, Program } from "@/types";

const NAV_TABS: BottomNavTab[] = [
  { href: "/dev/component-gallery#home", label: "Home", icon: Home },
  { href: "/dev/component-gallery#essentials", label: "Essentials", icon: ShoppingBag },
  { href: "/dev/component-gallery#programs", label: "Programs", icon: Calendar },
  { href: "/dev/component-gallery#receipts", label: "Receipts", icon: Receipt },
  { href: "/dev/component-gallery#profile", label: "Profile", icon: User },
];

const ALL_STATUSES: BadgeStatus[] = [
  "open",
  "fillingFast",
  "full",
  "closed",
  "paid",
  "pending",
  "failed",
  "refunded",
  "ready",
  "collected",
  "checkedIn",
  "cancelled",
];

export default function ComponentGalleryPage() {
  const { t } = useTranslation();
  const [books, setBooks] = useState<Book[] | null>(null);
  const [programs, setPrograms] = useState<Program[] | null>(null);
  const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getBooksByClass("school-niraj", "class-6").then((result) => {
      setBooks(result);
      setSelectedBookIds(new Set(result.map((book) => book.id)));
    });
    getPrograms({ schoolId: "school-niraj" }).then(setPrograms);
  }, []);

  function toggleBook(id: string, selected: boolean) {
    setSelectedBookIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <div className="pb-24">
      <AppHeader
        title="Component Gallery"
        backHref="/dev/kitchen-sink"
        right={<LanguageSwitcher />}
      />

      <div className="mx-auto max-w-3xl space-y-12 px-6 py-10">
        <header className="space-y-1">
          <Badge variant="secondary">Phase 2 — dev only</Badge>
          <p className="max-w-xl text-sm text-sub">
            Every shared component built for Phase 2, in a few example states, checked
            against real mock data via the data-source layer. Safe to delete once
            Phases 3+ have real screens to check against.
          </p>
        </header>

        <section id="section-card" className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">SectionCard</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <SectionCard
              icon={ShoppingBag}
              title="Essentials Store"
              description="Books, uniform & kit, and stationery — exactly what the school has listed."
              items={["Class-wise book list", "Size guide for uniform", "Fixed starter kit"]}
              accent="essentials"
            />
            <SectionCard
              icon={Calendar}
              title="Programs & Events"
              description="One global tab where any school can post a program."
              items={["Filter by school, category, date", "Seats shown before payment"]}
              accent="programs"
            />
          </div>
        </section>

        <section id="status-badge" className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">StatusBadge</h2>
          <div className="flex flex-wrap gap-2">
            {ALL_STATUSES.map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
        </section>

        <section id="item-card" className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">
            ItemCard — Grade 6 books (live mock data)
          </h2>
          <div className="space-y-3">
            {books === null
              ? Array.from({ length: 3 }).map((_, i) => <ItemCardSkeleton key={i} />)
              : books.slice(0, 4).map((book) => (
                  <ItemCard
                    key={book.id}
                    name={book.title}
                    meta={book.subject}
                    price={book.price}
                    selected={selectedBookIds.has(book.id)}
                    onToggleSelected={(selected) => toggleBook(book.id, selected)}
                  />
                ))}
          </div>
        </section>

        <section id="program-card" className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">
            ProgramCard — live mock programs
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {programs === null
              ? Array.from({ length: 2 }).map((_, i) => <ProgramCardSkeleton key={i} />)
              : programs.map((program) => (
                  <ProgramCard
                    key={program.id}
                    title={program.title}
                    date={program.date}
                    venue={program.venue}
                    fee={program.fee}
                    seatsAvailable={program.seatsAvailable}
                    status={program.status}
                  />
                ))}
          </div>
        </section>

        <section id="price-summary" className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">PriceSummary</h2>
          <PriceSummary
            lines={[
              { label: "Books", amount: 1240 },
              { label: "Uniform & Kit", amount: 2060 },
              { label: "Stationery", amount: 940 },
            ]}
            total={4240}
            note="No admission fee or delivery charge — this is the exact amount for the items listed above."
          />
        </section>

        <section id="receipt-card" className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">ReceiptCard</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <ReceiptCard
              schoolName="Niraj Public School"
              summaryLines={["Grade 6 Book Set", "Uniform & Kit (Size 32)"]}
              amount={3020}
              date="2026-06-12"
              qrValue="receipt-demo-001"
              status="ready"
            />
            <ReceiptCard
              schoolName="Niraj Public School"
              summaryLines={["Summer Robotics Camp — Ticket"]}
              amount={2500}
              date="2026-05-01"
              qrValue="receipt-demo-002"
              status="checkedIn"
              onDownload={() => {}}
              onShare={() => {}}
            />
          </div>
          <ReceiptCardSkeleton />
        </section>

        <section id="empty-state" className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">EmptyState</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <EmptyState
              icon={Inbox}
              title={t.common.noItemsYet}
              description="Programs matching your filters will show up here."
            />
            <EmptyState
              icon={Receipt}
              title={t.common.noItemsYet}
              description="Complete a checkout to see your first receipt."
              actionLabel={t.common.viewDetails}
              actionHref="/dev/component-gallery#receipt-card"
            />
          </div>
        </section>

        <section id="misc" className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">SectionCard accents (all six)</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <SectionCard icon={Home} title="Workspace" accent="workspace" />
            <SectionCard icon={BookOpen} title="Essentials" accent="essentials" />
            <SectionCard icon={Calendar} title="Programs" accent="programs" />
            <SectionCard icon={Receipt} title="Payments" accent="pay" />
            <SectionCard icon={Shirt} title="Console" accent="console" />
            <SectionCard icon={User} title="Platform" accent="platform" />
          </div>
        </section>
      </div>

      <BottomNav tabs={NAV_TABS} />
    </div>
  );
}
