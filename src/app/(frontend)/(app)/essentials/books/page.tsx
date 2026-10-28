"use client";

import { useEffect, useState, type ReactNode } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { AppHeader } from "@/components/shared/app-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ItemCard } from "@/components/shared/item-card";
import { ItemCardSkeleton } from "@/components/shared/loading-skeletons";
import { Atom, BookOpen, Bot, Check, GraduationCap, Home, Languages, LineChart, Loader2, Lock, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useTranslation } from "@/i18n/context";
import { secondLanguageOf } from "@/lib/academic-language";
import { assignedBookSetOf, bookMatchesAssignedSet } from "@/lib/book-set";
import { bookToCartItem } from "@/lib/cart-items";
import { getBookSelectionState, getBooksByClass, saveBookSelection } from "@/lib/data-source";
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

/**
 * One selectable card in an OptionGroup — cards, not a dropdown, per the school's request for a clearer, single-choice selection UI.
 * In a `locked` group (the school assigned this choice) the assigned card stays highlighted but isn't clickable, and every other card is dimmed + disabled.
 */
function OptionCard({
  icon: Icon,
  label,
  selected,
  locked = false,
  onSelect,
}: {
  icon: LucideIcon;
  label: string;
  selected: boolean;
  locked?: boolean;
  onSelect: () => void;
}) {
  const dimmed = locked && !selected;
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={dimmed}
      aria-disabled={locked}
      onClick={() => {
        if (!locked) onSelect();
      }}
      className={cn(
        "relative flex flex-col items-center gap-2.5 rounded-xl border-2 bg-card p-4 text-center transition-all sm:p-5",
        !locked && "hover:-translate-y-0.5 hover:shadow-md",
        locked && "cursor-default",
        dimmed && "cursor-not-allowed opacity-45 saturate-0",
        selected ? "border-brand shadow-sm ring-2 ring-brand/15" : "border-line/60",
        !selected && !locked && "hover:border-brand/40",
      )}
    >
      {selected ? (
        <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-brand text-white">
          {locked ? <Lock className="size-3" /> : <Check className="size-3.5" />}
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

function OptionGroup({ title, columns, locked = false, children }: { title: string; columns: 2 | 3; locked?: boolean; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2.5">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        {title}
        {locked ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-sub">
            <Lock className="size-3" />
            {t.bookLock.lockedBadge}
          </span>
        ) : null}
      </p>
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
  const { data: swrCatalogue } = useSWR(
    profile ? ["books:catalogue", profile.schoolId, profile.classLevelId] : null,
    () => getBooksByClass(profile!.schoolId, profile!.classLevelId),
  );
  const catalogue = swrCatalogue ?? null;
  const [step, setStep] = useState<"select" | "review">("select");
  const [selectedLanguage, setSelectedLanguage] = useState<AcademicLanguage | "">("");
  const [selectedStream, setSelectedStream] = useState<Stream | "">("");
  const [selectedElective, setSelectedElective] = useState<Elective | "">("");
  const [defaultsAppliedFor, setDefaultsAppliedFor] = useState<Book[] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // Can the student still change their choice? Not once books of this class are bought / being paid for.
  const { data: selectionState, error: selectionError, mutate: mutateSelectionState } = useSWR(
    profile ? ["books:selection-state", profile.id, profile.classLevelId] : null,
    () => getBookSelectionState(),
  );

  // The school may have changed the student's choice (or class) since this
  // session's profile was loaded — re-read it so the selection is current.
  useEffect(() => {
    void globalMutate("auth:me");
  }, []);

  // Drop any book in the cart that no longer belongs to the assigned set
  // (e.g. a change request was approved after the student filled the cart).
  const reconcileKind = cart.reconcileKind;
  useEffect(() => {
    if (!profile || !swrCatalogue) return;
    const assignedSet = assignedBookSetOf(profile);
    reconcileKind(
      "book",
      swrCatalogue.filter((book) => bookMatchesAssignedSet(book, assignedSet)).map((book) => lineId("book", book.id)),
    );
  }, [profile, swrCatalogue, reconcileKind]);

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
    const secondLanguage = profile ? secondLanguageOf(profile) : undefined;
    if (secondLanguage && languages.has(secondLanguage)) {
      setSelectedLanguage(secondLanguage);
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

  // The student chooses freely (their saved choice — first the school's roster value — is pre-selected),
  // until they have bought this class's books: then the saved choice is locked and only the school can change it.
  const assigned = assignedBookSetOf(profile);
  const bought = selectionState?.locked === true;
  const languageLocked = bought && Boolean(assigned.secondLanguage && languageOptions.includes(assigned.secondLanguage));
  const streamLocked = bought && Boolean(assigned.stream && streamOptions.includes(assigned.stream));
  const electiveLocked = bought && Boolean(assigned.elective && electiveOptions.includes(assigned.elective));
  const effLanguage = languageLocked ? assigned.secondLanguage! : selectedLanguage;
  const effStream = streamLocked ? assigned.stream! : selectedStream;
  const effElective = electiveLocked ? assigned.elective! : selectedElective;

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
    (selectionState !== undefined || selectionError !== undefined) &&
    (languageOptions.length === 0 || effLanguage !== "") &&
    (streamOptions.length === 0 || effStream !== "") &&
    (electiveOptions.length === 0 || effElective !== "");

  const chosenLabels = [
    effLanguage ? languageLabel(effLanguage) : null,
    effStream ? streamLabel(effStream) : null,
    effElective ? electiveLabel(effElective) : null,
  ].filter((label): label is string => Boolean(label));

  const matchedBooks = catalogue.filter(
    (book) =>
      (languageOptions.length === 0 || book.language === effLanguage) &&
      (streamOptions.length === 0 || book.stream === effStream) &&
      (electiveOptions.length === 0 || book.elective === effElective),
  );

  function goToReview() {
    cart.reconcileKind(
      "book",
      matchedBooks.map((book) => lineId("book", book.id)),
    );
    // Books are compulsory (never à la carte) — always (re-)include them,
    // ignoring any stale `excludedIds` entry from the cart page's remove
    // control, so this step's Next button never silently disappears.
    matchedBooks.forEach((book) => cart.setIncluded(bookToCartItem(book, chosenLabels), true));
    setStep("review");
  }

  // Pressing Next: a student who can still change their choice confirms it first; the confirmed choice is
  // saved to their profile (and logged for the school) before the books are added.
  function handleNext() {
    if (bought) goToReview();
    else setConfirmOpen(true);
  }

  async function confirmChoice() {
    setSaving(true);
    try {
      const result = await saveBookSelection({
        secondLanguage: effLanguage || undefined,
        stream: effStream || undefined,
        elective: effElective || undefined,
      });
      if (result.changed) await globalMutate("auth:me");
      setConfirmOpen(false);
      goToReview();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.bookLock.saveFailed);
      void mutateSelectionState();
    } finally {
      setSaving(false);
    }
  }

  const subtotal = matchedBooks.reduce((sum, book) => sum + book.price, 0);

  const selectionRows = (
    <>
      {languageOptions.length > 0 ? (
        <SelectionRow
          icon={Languages}
          label={t.essentials.secondLanguageLabel}
          value={effLanguage ? languageLabel(effLanguage) : null}
          placeholder={t.essentials.notSelectedYet}
        />
      ) : null}
      {streamOptions.length > 0 ? (
        <SelectionRow
          icon={effStream ? streamIcon(effStream) : Atom}
          label={t.essentials.specializationLabel}
          value={effStream ? streamLabel(effStream) : null}
          placeholder={t.essentials.notSelectedYet}
        />
      ) : null}
      {electiveOptions.length > 0 ? (
        <SelectionRow
          icon={effElective ? electiveIcon(effElective) : GraduationCap}
          label={t.essentials.specialization2Label}
          value={effElective ? electiveLabel(effElective) : null}
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
              {bought ? (
                <div className="flex items-start gap-3 rounded-xl border border-line/60 bg-muted/40 p-4">
                  <Lock className="mt-0.5 size-4 shrink-0 text-sub" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{t.bookLock.boughtTitle}</p>
                    <p className="text-sm text-sub">{t.bookLock.boughtNote}</p>
                  </div>
                </div>
              ) : null}
              {languageOptions.length > 0 ? (
                <OptionGroup title={t.essentials.secondLanguageLabel} columns={2} locked={languageLocked}>
                  {languageOptions.map((opt) => (
                    <OptionCard
                      key={opt}
                      icon={Languages}
                      label={languageLabel(opt)}
                      selected={effLanguage === opt}
                      locked={languageLocked}
                      onSelect={() => setSelectedLanguage(opt)}
                    />
                  ))}
                </OptionGroup>
              ) : null}
              {streamOptions.length > 0 ? (
                <OptionGroup title={t.essentials.specializationLabel} columns={2} locked={streamLocked}>
                  {streamOptions.map((opt) => (
                    <OptionCard
                      key={opt}
                      icon={streamIcon(opt)}
                      label={streamLabel(opt)}
                      selected={effStream === opt}
                      locked={streamLocked}
                      onSelect={() => setSelectedStream(opt)}
                    />
                  ))}
                </OptionGroup>
              ) : null}
              {electiveOptions.length > 0 ? (
                <OptionGroup title={t.essentials.specialization2Label} columns={3} locked={electiveLocked}>
                  {electiveOptions.map((opt) => (
                    <OptionCard
                      key={opt}
                      icon={electiveIcon(opt)}
                      label={electiveLabel(opt)}
                      selected={effElective === opt}
                      locked={electiveLocked}
                      onSelect={() => setSelectedElective(opt)}
                    />
                  ))}
                </OptionGroup>
              ) : null}
              <Button className="w-full lg:hidden" disabled={!canProceed} onClick={handleNext}>
                {t.common.next}
              </Button>
            </div>

            <aside className="sticky top-6 hidden rounded-xl border border-line/60 bg-card p-5 lg:block">
              <p className="font-heading text-base font-semibold text-ink">{t.essentials.yourSelectionTitle}</p>
              <div className="mt-1 divide-y divide-line/60">{selectionRows}</div>
              <Button className="mt-4 w-full" disabled={!canProceed} onClick={handleNext}>
                {t.common.next}
              </Button>
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
      <Dialog open={confirmOpen} onOpenChange={(open) => (!saving ? setConfirmOpen(open) : undefined)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.bookLock.confirmTitle}</DialogTitle>
            <DialogDescription>{t.bookLock.confirmIntro}</DialogDescription>
          </DialogHeader>
          <div className="divide-y divide-line/60 rounded-lg border border-line/60 px-3">{selectionRows}</div>
          <p className="rounded-lg border border-section-programs/30 bg-section-programs-bg p-3 text-sm text-section-programs">
            {t.bookLock.confirmWarning}
          </p>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setConfirmOpen(false)}>
              {t.bookLock.goBack}
            </Button>
            <Button disabled={saving} onClick={() => void confirmChoice()}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {t.bookLock.confirmButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {step === "review" && matchedBooks.length > 0 ? (
        <EssentialsReviewBar
          kind="book"
          ctaLabel={t.common.next}
          ctaHref="/essentials/uniform"
          countOverride={matchedBooks.length}
          totalOverride={subtotal}
        />
      ) : null}
    </>
  );
}
