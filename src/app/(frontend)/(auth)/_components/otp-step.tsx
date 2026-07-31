"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n/context";
import { formatTemplate } from "@/i18n/format";
import { cn } from "@/lib/utils";

const RESEND_SECONDS = 45;

/** Fixed demo code — there is no real SMS backend yet, see CLAUDE.md. */
export const DEMO_OTP = "123456";

export interface OtpStepProps {
  mobileDisplay: string;
  onVerified: () => void;
  onChangeNumber: () => void;
  /** Resets the countdown — this mock doesn't actually resend anything. */
  onResend?: () => void;
}

/** The "enter the 6-digit code" step, identical between Login and Register. */
export function OtpStep({ mobileDisplay, onVerified, onChangeNumber, onResend }: OtpStepProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function handleVerify() {
    if (code === DEMO_OTP) {
      setError(null);
      onVerified();
    } else {
      setError(t.auth.errors.incorrectOtp);
    }
  }

  function handleResend() {
    setSecondsLeft(RESEND_SECONDS);
    setCode("");
    setError(null);
    onResend?.();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="font-heading text-2xl font-bold text-ink">{t.auth.otp.title}</h1>
        <p className="text-sm text-sub">
          {t.auth.otp.subtitleFor} <span className="font-medium text-ink">{mobileDisplay}</span>
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-brand/40 bg-section-workspace-bg p-4 text-center">
        <p className="text-xs font-semibold tracking-wide text-brand uppercase">{t.auth.otp.demoLabel}</p>
        <p className="font-heading text-2xl font-bold tracking-[0.3em] text-ink">{DEMO_OTP}</p>
        <p className="mt-1 text-xs text-sub">{t.auth.otp.demoNote}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="otp-code">{t.auth.otp.codeLabel}</Label>
        <Input
          id="otp-code"
          inputMode="numeric"
          maxLength={6}
          placeholder={t.auth.otp.codePlaceholder}
          value={code}
          onChange={(event) => {
            setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
            setError(null);
          }}
          aria-invalid={error ? true : undefined}
          className={cn(error && "border-destructive")}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <Button className="w-full" disabled={code.length !== 6} onClick={handleVerify}>
        {t.auth.otp.verify}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onChangeNumber}
          className="font-medium text-brand hover:underline"
        >
          {t.auth.otp.changeNumber}
        </button>
        {secondsLeft > 0 ? (
          <span className="text-sub">{formatTemplate(t.auth.otp.resendIn, { n: secondsLeft })}</span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className="font-medium text-brand hover:underline"
          >
            {t.auth.otp.resend}
          </button>
        )}
      </div>
    </div>
  );
}
