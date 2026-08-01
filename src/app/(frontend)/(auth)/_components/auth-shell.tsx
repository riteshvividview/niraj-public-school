import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  /** Verified-reachable stock photo URL — see the image src's own alt text for the theme. */
  imageSrc: string;
  imageAlt: string;
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  children: ReactNode;
  /** Extra content rendered over the image on md+ screens (e.g. a quote/highlight). */
  imageOverlay?: ReactNode;
  className?: string;
}

/**
 * Shared visual chrome for the language/login/register screens: a
 * full-bleed themed photo + gradient on md+ (becomes a compact banner on
 * mobile, since plan.html is explicit this is primarily a phone experience),
 * decorative blurred brand-color blobs, and a glass-effect form card that
 * fades/slides in on mount.
 */
export function AuthShell({
  imageSrc,
  imageAlt,
  eyebrow,
  title,
  subtitle,
  children,
  imageOverlay,
  className,
}: AuthShellProps) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background md:flex-row">
      {/* Decorative ambient blobs — subtle motion, brand palette only. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 size-72 animate-pulse rounded-full bg-brand/20 blur-3xl [animation-duration:6s]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-0 size-96 animate-pulse rounded-full bg-brand-2/20 blur-3xl [animation-duration:8s]"
      />

      {/* Image panel: compact banner on mobile, full-height on md+. */}
      <div className="relative h-44 w-full shrink-0 overflow-hidden md:h-auto md:w-2/5 lg:w-1/2">
        <img
          src={imageSrc}
          alt={imageAlt}
          className="absolute inset-0 size-full object-cover animate-in fade-in duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/30 to-brand/40 md:bg-gradient-to-br md:from-ink/70 md:via-brand/40 md:to-brand-2/50" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-6 text-white md:inset-0 md:justify-end md:p-10">
          <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide uppercase backdrop-blur-sm">
            {eyebrow}
          </span>
          <p className="mt-2 hidden font-heading text-2xl leading-tight font-bold md:block lg:text-3xl">
            {title}
          </p>
          {imageOverlay}
        </div>
      </div>

      {/* Form panel */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-8 md:py-10">
        <div
          className={cn(
            "w-full max-w-md animate-in fade-in slide-in-from-bottom-4 space-y-6 rounded-3xl border border-line/60 bg-card/80 p-6 shadow-xl shadow-ink/5 backdrop-blur-sm duration-500 sm:p-8",
            className,
          )}
        >
          <div className="space-y-1.5 text-center md:text-left">
            <h1 className="font-heading text-2xl font-bold text-ink">{title}</h1>
            <p className="text-sm text-sub">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
