"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import Confetti from "react-confetti";

function getWindowSize() {
  if (typeof window === "undefined") return { width: 0, height: 0 };
  return { width: window.innerWidth, height: window.innerHeight };
}

const CONFETTI_COLORS = ["#2f6fed", "#0d9488", "#e08e00", "#22c55e", "#ffffff"];

/** Draws itself in (ring, then checkmark) via CSS keyframes defined in globals.css — see success-ring-draw / success-check-draw. */
function SuccessBadge() {
  return (
    <div className="relative flex size-28 shrink-0 items-center justify-center">
      <span className="animate-success-iris-burst absolute inset-0 rounded-full bg-green-500" />
      <span className="animate-success-badge-pop absolute inset-0 rounded-full bg-green-50 dark:bg-green-500/15" />
      <Sparkles
        className="animate-success-sparkle absolute -top-1.5 -right-1 size-5 text-warm"
        style={{ animationDelay: "0.7s" }}
      />
      <Sparkles
        className="animate-success-sparkle absolute -bottom-1 -left-2 size-4 text-brand-2"
        style={{ animationDelay: "1.1s" }}
      />
      <svg viewBox="0 0 96 96" className="relative size-28">
        <circle
          cx="48"
          cy="48"
          r="40"
          fill="none"
          stroke="#22c55e"
          strokeWidth="4"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          className="animate-success-ring-draw"
        />
        <path
          d="M30 49 L43 62 L67 35"
          fill="none"
          stroke="#22c55e"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          className="animate-success-check-draw"
        />
      </svg>
    </div>
  );
}

function GeneratingStatus({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-sub">
      <span>{label}</span>
      <span className="flex items-end gap-0.5">
        <span className="animate-success-dot-bounce size-1 rounded-full bg-sub" style={{ animationDelay: "0s" }} />
        <span className="animate-success-dot-bounce size-1 rounded-full bg-sub" style={{ animationDelay: "0.15s" }} />
        <span className="animate-success-dot-bounce size-1 rounded-full bg-sub" style={{ animationDelay: "0.3s" }} />
      </span>
    </div>
  );
}

/** Full-screen payment success moment — shown while the receipt generates in the background. */
export function PaymentSuccessOverlay({
  title,
  description,
  amountLabel,
  methodRowLabel,
  paymentMethodLabel,
  itemsRowLabel,
  itemsLabel,
}: {
  title: string;
  description: string;
  amountLabel: string;
  methodRowLabel: string;
  paymentMethodLabel: string;
  itemsRowLabel: string;
  itemsLabel: string;
}) {
  const [size, setSize] = useState(getWindowSize);

  useEffect(() => {
    function handleResize() {
      setSize(getWindowSize());
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="animate-success-backdrop-in fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-md">
      <Confetti
        width={size.width}
        height={size.height}
        numberOfPieces={500}
        recycle={false}
        gravity={0.22}
        colors={CONFETTI_COLORS}
        className="pointer-events-none"
      />
      <div className="animate-success-card-in relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-line/60 bg-card px-8 py-10 text-center shadow-2xl sm:max-w-md">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(closest-side,rgba(34,197,94,0.16),transparent)]"
        />
        <div className="relative flex flex-col items-center gap-5">
          <SuccessBadge />

          <div className="space-y-1.5">
            <h2 className="font-heading text-2xl font-bold text-ink sm:text-3xl">{title}</h2>
            <p className="font-heading text-4xl font-bold text-brand sm:text-5xl">{amountLabel}</p>
          </div>

          <div className="w-full space-y-2 rounded-2xl border border-line/60 bg-muted/50 px-5 py-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-sub">{methodRowLabel}</span>
              <span className="font-medium text-ink uppercase">{paymentMethodLabel}</span>
            </div>
            <div className="flex items-center justify-between border-t border-line/60 pt-2">
              <span className="text-sub">{itemsRowLabel}</span>
              <span className="font-medium text-ink">{itemsLabel}</span>
            </div>
          </div>

          <GeneratingStatus label={description} />
        </div>
      </div>
    </div>
  );
}
