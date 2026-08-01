import Image from "next/image";
import type { ReactNode } from "react";

interface AuthShellProps {
  /** A path under public/ — see the image src's own alt text for the theme. */
  imageSrc: string;
  imageAlt: string;
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  children: ReactNode;
}

/**
 * Shared visual chrome for the language/login/register screens: a
 * full-bleed themed photo on md+ (becomes a compact banner on mobile, since
 * plan.html is explicit this is primarily a phone experience) beside a form
 * panel that fills the rest of the viewport directly — no boxed/floating
 * card, no border, no shadow. Decorative blurred brand-color blobs add
 * depth without needing a container to sit inside of.
 */
export function AuthShell({ imageSrc, imageAlt, eyebrow, title, subtitle, children }: AuthShellProps) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background md:flex-row">
      {/* Decorative ambient blobs — subtle motion, brand palette only. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 size-72 animate-pulse rounded-full bg-brand/10 blur-3xl [animation-duration:6s]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-0 size-96 animate-pulse rounded-full bg-brand-2/10 blur-3xl [animation-duration:8s]"
      />

      {/* Image panel: compact banner on mobile, full-height on md+. */}
      <div className="relative h-40 w-full shrink-0 overflow-hidden sm:h-52 md:h-auto md:w-2/5 lg:w-1/2">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          priority
          sizes="(min-width: 768px) 40vw, 100vw"
          className="object-cover brightness-110 contrast-105 animate-in fade-in duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent md:bg-gradient-to-t md:from-ink/50 md:via-transparent md:to-transparent" />
        <span className="absolute bottom-4 left-4 w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase backdrop-blur-sm md:bottom-8 md:left-8">
          {eyebrow}
        </span>
      </div>

      {/* Form panel — fills the remaining space directly, no card. */}
      <div className="relative z-10 flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 md:px-14 lg:px-20">
        <div className="mx-auto w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 space-y-8 duration-500">
          <div className="space-y-2">
            <h1 className="font-heading text-3xl font-bold text-ink lg:text-4xl">{title}</h1>
            <p className="text-base text-sub">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
