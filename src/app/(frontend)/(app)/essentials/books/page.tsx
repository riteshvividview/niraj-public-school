"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ItemCard } from "@/components/shared/item-card";
import { ItemCardSkeleton } from "@/components/shared/loading-skeletons";
import { Atom, BookOpen, Bot, Check, GraduationCap, Home, Languages, LineChart, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/context";
import { bookToCartItem } from "@/lib/cart-items";
import { getBooksByClass } from "@/lib/data-source";
import { formatCurrencyINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth-store";
import { lineId, useCart } from "@/store/cart-store";
import type { AcademicLanguage, Book, Elective, Stream } from "@/types";
import { EssentialsReviewBar } from "../_components/review-bar";

function streamIcon(value: Stream): LucideIcon {
  return value === "science" ? Atom : LineChart;
}
function electiveIcon(value: Elective): LucideIcon {
  if (value === "ena") return GraduationCap;
  if (value === "homeScience") return Home;
  return Bot;
}

/** One selectable card in an OptionGroup — cards, not a dropdown, per the school's request for a clearer, single-choice selection UI. */
function OptionCard({ icon: Icon, label, selected, onSelect }: { icon: LucideIcon; label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-center gap-2.5 rounded-xl border-2 bg-card p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-5",
        selected ? "border-brand shadow-sm ring-2 ring-brand/15" : "border-line/60 hover:border-brand/40",
      )}
    >
      {selected ? (
        <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-brand text-white">
          <Check className="size-3.5" />
        </span>
      ) : null}
      <div
        className={cn(
          "flex size-11 items-center justify-center rounded-full transition-colors",
          selected ? "bg-brand text-white" : "bg-section-essentials-bg text-section-essentials",
        )}
      >
        <Icon className="size-5" />
      </div>
      <span className={cn("text-sm font-semibold", selected ? "text-ink" : "text-sub")}>{label}</span>
    </button>
  );
}

function OptionGroup({ title, columns, children }: { title: string; columns: 2 | 3; children: ReactNode }) {
  return (
    <div className="space-y-2.5">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <div className={cn("grid gap-2.5 sm:gap-3", columns === 2 ? "grid-cols-2" : "grid-cols-3")}>{children}</div>
    </div>
  );
}

/** A "2nd Language: Telugu" style row — used in both the live selection sidebar and the review step's detailed breakdown. */
function SelectionRow({ icon: Icon, label, value, placeholder }: { icon: LucideIcon; label: string; value: string | null; placeholder: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-section-essentials-bg text-section-essentials">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-sub">{label}</p>
        <p className={cn("truncate text-sm font-medium", value ? "text-ink" : "text-sub italic")}>
          {value ?? placeholder}
        </p>
      </div>
    </div>
  );
}

/** Books are one row per (class × language × stream × elective) "book set" — see src/collections/Books.ts. */
export default function BooksPage() {
  const { t, language } = useTranslation();
  const { profile } = useAuth();
  const cart = useCart();
  const [catalogue, setCatalogue] = useState<Book[] | null>(null);
  const [step, setStep] = useState<"select" | "review">("select");
  const [selectedLanguage, setSelectedLanguage] = useState<AcademicLanguage | "">("");
  const [selectedStream, setSelectedStream] = useState<Stream | "">("");
  const [selectedElective, setSelectedElective] = useState<Elective | "">("");
  const [defaultsAppliedFor, setDefaultsAppliedFor] = useState<Book[] | null>(null);

  useEffect(() => {
    if (!profile) return;
    getBooksByClass(profile.schoolId, profile.classLevelId).then(setCatalogue);
  }, [profile]);

  // Seed the selection step from the student's saved profile the first time
  // the class catalogue is known, so returning students see everything
  // pre-checked instead of having to pick from scratch every visit. Adjusted
  // directly during render (React's "adjusting state when props change"
  // pattern) rather than in an Effect, since it's deriving initial state
  // from a prop, not synchronizing with an external system.
  if (catalogue && catalogue !== defaultsAppliedFor) {
    const languages = new Set(catalogue.map((b) => b.language).filter(Boolean));
    const streams = new Set(catalogue.map((b) => b.stream).filter(Boolean));
    const electives = new Set(catalogue.map((b) => b.elective).filter(Boolean));
    setDefaultsAppliedFor(catalogue);
    if (profile?.academicLanguage && languages.has(profile.academicLanguage)) {
      setSelectedLanguage(profile.academicLanguage);
    }
    if (profile?.stream && streams.has(profile.stream)) {
      setSelectedStream(profile.stream);
    }
    if (profile?.elective && electives.has(profile.elective)) {
      setSelectedElective(profile.elective);
    }
  }

  if (!profile) return null;

  if (catalogue === null) {
    return (
      <>
        <AppHeader title={t.essentials.books} backHref="/essentials" showAvatar />
        <div className="w-full space-y-4 p-4 pb-28 sm:space-y-5 sm:p-6 lg:p-8">
          <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <ItemCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </>
    );
  }

  if (catalogue.length === 0) {
    return (
      <>
        <AppHeader title={t.essentials.books} backHref="/essentials" showAvatar />
        <div className="w-full space-y-4 p-4 pb-28 sm:space-y-5 sm:p-6 lg:p-8">
          <EmptyState icon={BookOpen} title={t.common.noItemsYet} />
        </div>
      </>
    );
  }

  const languageOptions = ([...new Set(catalogue.map((b) => b.language).filter(Boolean))] as AcademicLanguage[]);
  const streamOptions = ([...new Set(catalogue.map((b) => b.stream).filter(Boolean))] as Stream[]);
  const electiveOptions = ([...new Set(catalogue.map((b) => b.elective).filter(Boolean))] as Elective[]);

  const languageLabel = (value: AcademicLanguage) =>
    value === "hindi" ? t.essentials.languageHindi : t.essentials.languageTelugu;
  const streamLabel = (value: Stream) =>
    value === "science" ? t.essentials.streamScience : t.essentials.streamEconomics;
  const electiveLabel = (value: Elective) =>
    value === "ena"
      ? t.essentials.electiveEna
      : value === "homeScience"
        ? t.essentials.electiveHomeScience
        : t.essentials.electiveRoboticsAI;

  const canProceed =
    (languageOptions.length === 0 || selectedLanguage !== "") &&
    (streamOptions.length === 0 || selectedStream !== "") &&
    (electiveOptions.length === 0 || selectedElective !== "");

  const chosenLabels = [
    selectedLanguage ? languageLabel(selectedLanguage) : null,
    selectedStream ? streamLabel(selectedStream) : null,
    selectedElective ? electiveLabel(selectedElective) : null,
  ].filter((label): label is string => Boolean(label));

  const matchedBooks = catalogue.filter(
    (book) =>
      (languageOptions.length === 0 || book.language === selectedLanguage) &&
      (streamOptions.length === 0 || book.stream === selectedStream) &&
      (electiveOptions.length === 0 || book.elective === selectedElective),
  );

  function goToReview() {
    cart.reconcileKind(
      "book",
      matchedBooks.map((book) => lineId("book", book.id)),
    );
    matchedBooks.forEach((book) => cart.ensureDefault(bookToCartItem(book, chosenLabels)));
    setStep("review");
  }

  const subtotal = matchedBooks.reduce((sum, book) => sum + book.price, 0);

  const selectionRows = (
    <>
      {languageOptions.length > 0 ? (
        <SelectionRow
          icon={Languages}
          label={t.essentials.secondLanguageLabel}
          value={selectedLanguage ? languageLabel(selectedLanguage) : null}
          placeholder={t.essentials.notSelectedYet}
        />
      ) : null}
      {streamOptions.length > 0 ? (
        <SelectionRow
          icon={selectedStream ? streamIcon(selectedStream) : Atom}
          label={t.essentials.specializationLabel}
          value={selectedStream ? streamLabel(selectedStream) : null}
          placeholder={t.essentials.notSelectedYet}
        />
      ) : null}
      {electiveOptions.length > 0 ? (
        <SelectionRow
          icon={selectedElective ? electiveIcon(selectedElective) : GraduationCap}
          label={t.essentials.specialization2Label}
          value={selectedElective ? electiveLabel(selectedElective) : null}
          placeholder={t.essentials.notSelectedYet}
        />
      ) : null}
    </>
  );

  return (
    <>
      <AppHeader title={t.essentials.books} backHref="/essentials" showAvatar />
      <div className="w-full space-y-4 p-4 pb-28 sm:space-y-5 sm:p-6 lg:p-8">
        {step === "select" ? (
          <div className="lg:grid lg:grid-cols-[1fr_300px] lg:items-start lg:gap-6">
            <div className="space-y-5">
              <p className="text-sm text-sub">{t.essentials.selectionSubtitle}</p>
              {languageOptions.length > 0 ? (
                <OptionGroup title={t.essentials.secondLanguageLabel} columns={2}>
                  {languageOptions.map((opt) => (
                    <OptionCard
                      key={opt}
                      icon={Languages}
                      label={languageLabel(opt)}
                      selected={selectedLanguage === opt}
                      onSelect={() => setSelectedLanguage(opt)}
                    />
                  ))}
                </OptionGroup>
              ) : null}
              {streamOptions.length > 0 ? (
                <OptionGroup title={t.essentials.specializationLabel} columns={2}>
                  {streamOptions.map((opt) => (
                    <OptionCard
                      key={opt}
                      icon={streamIcon(opt)}
                      label={streamLabel(opt)}
                      selected={selectedStream === opt}
                      onSelect={() => setSelectedStream(opt)}
                    />
                  ))}
                </OptionGroup>
              ) : null}
              {electiveOptions.length > 0 ? (
                <OptionGroup title={t.essentials.specialization2Label} columns={3}>
                  {electiveOptions.map((opt) => (
                    <OptionCard
                      key={opt}
                      icon={electiveIcon(opt)}
                      label={electiveLabel(opt)}
                      selected={selectedElective === opt}
                      onSelect={() => setSelectedElective(opt)}
                    />
                  ))}
                </OptionGroup>
              ) : null}
              <Button className="w-full" disabled={!canProceed} onClick={goToReview}>
                {t.common.next}
              </Button>
            </div>

            <aside className="sticky top-6 hidden rounded-xl border border-line/60 bg-card p-5 lg:block">
              <p className="font-heading text-base font-semibold text-ink">{t.essentials.yourSelectionTitle}</p>
              <div className="mt-1 divide-y divide-line/60">{selectionRows}</div>
            </aside>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-[320px_1fr] lg:items-start lg:gap-6">
            <div className="rounded-xl border border-line/60 bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-heading text-base font-semibold text-ink">{t.essentials.yourSelectionTitle}</p>
                <button
                  type="button"
                  className="shrink-0 text-sm font-medium text-brand hover:underline"
                  onClick={() => setStep("select")}
                >
                  {t.essentials.changeSelection}
                </button>
              </div>
              <div className="mt-1 divide-y divide-line/60">{selectionRows}</div>
            </div>

            <div className="mt-4 space-y-3 lg:mt-0">
              {matchedBooks.length === 0 ? (
                <EmptyState icon={BookOpen} title={t.essentials.noBookSetTitle} description={t.essentials.noBookSetDescription} />
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-lg border border-line/60 bg-card p-4">
                    <span className="text-sm text-sub">{t.common.total}</span>
                    <span className="font-heading text-lg font-bold text-ink">
                      {formatCurrencyINR(subtotal, language)}
                    </span>
                  </div>
                  <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
                    {matchedBooks.map((book) => (
                      <ItemCard key={book.id} name={book.title} meta={book.subject} price={book.price} selected />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      {step === "review" && matchedBooks.length > 0 ? (
        <EssentialsReviewBar kind="book" ctaLabel={t.common.next} ctaHref="/essentials/uniform" />
      ) : null}
    </>
  );
}
