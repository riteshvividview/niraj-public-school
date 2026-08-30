"use client";

import { CheckCircle2, IdCard, KeyRound, Loader2, Mail, ShieldCheck, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n/context";
import { formatTemplate } from "@/i18n/format";

type Step = "register" | "verify" | "reset" | "success";

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; error?: string; maskedEmail?: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return res.ok ? { ok: true, maskedEmail: json.maskedEmail } : { ok: false, error: json.error ?? "Something went wrong." };
}

const STEP_META: Record<Step, { icon: typeof Mail; ring: string }> = {
  register: { icon: IdCard, ring: "ring-brand/15" },
  verify: { icon: ShieldCheck, ring: "ring-brand-2/15" },
  reset: { icon: KeyRound, ring: "ring-warm/15" },
  success: { icon: CheckCircle2, ring: "ring-brand-2/15" },
};

export function ForgotPasswordDialog({
  open,
  onOpenChange,
  onPasswordReset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPasswordReset: (registerNumber: string) => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("register");
  const [registerNumber, setRegisterNumber] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setStep("register");
    setRegisterNumber("");
    setMaskedEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setIsSubmitting(false);
  }

  async function handleRequestOtp(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await postJson("/api/forgot-password/request", { registerNumber: registerNumber.trim() });
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? t.auth.login.invalidCredentials);
      return;
    }
    setMaskedEmail(result.maskedEmail ?? "");
    setStep("verify");
  }

  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await postJson("/api/forgot-password/verify", { registerNumber: registerNumber.trim(), otp });
    setIsSubmitting(false);
    if (!result.ok) {
      setError(t.profile.otpInvalid);
      return;
    }
    setStep("reset");
  }

  async function handleReset(event: FormEvent) {
    event.preventDefault();
    if (newPassword.length < 8) {
      setError(t.profile.passwordTooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.profile.passwordMismatch);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    const result = await postJson("/api/forgot-password/reset", {
      registerNumber: registerNumber.trim(),
      newPassword,
    });
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Couldn't update your password.");
      return;
    }
    onPasswordReset(registerNumber.trim());
    setStep("success");
  }

  const StepIcon = STEP_META[step].icon;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="overflow-hidden p-0 sm:max-w-sm" showCloseButton={false}>
        <div className="relative bg-gradient-to-br from-brand via-brand to-brand-2 px-6 pt-6 pb-8 text-white">
          <DialogClose asChild>
            <button
              type="button"
              className="absolute top-3 right-3 rounded-full p-1 text-white/80 transition hover:bg-white/15 hover:text-white"
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </button>
          </DialogClose>
          <DialogHeader>
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-white/15 ring-8 ring-white/15">
              <StepIcon className="size-7 text-white" />
            </div>
            <DialogTitle className="mt-3 text-center text-white">
              {step === "success" ? t.auth.forgotPassword.successTitle : t.auth.forgotPassword.title}
            </DialogTitle>
          </DialogHeader>
          {step !== "success" ? (
            <div className="mt-4 flex items-center justify-center gap-2">
              {(["register", "verify", "reset"] as Step[]).map((s, i) => (
                <span
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${
                    s === step
                      ? "w-6 bg-white"
                      : (["register", "verify", "reset"] as Step[]).indexOf(step) > i
                        ? "w-1.5 bg-white/80"
                        : "w-1.5 bg-white/30"
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="-mt-4 rounded-t-2xl bg-card px-6 pt-6 pb-6">
          {step === "register" ? (
            <form className="space-y-4" onSubmit={handleRequestOtp}>
              <div className="space-y-2">
                <Label htmlFor="forgot-register-number">{t.auth.forgotPassword.registerNumberLabel}</Label>
                <Input
                  id="forgot-register-number"
                  autoFocus
                  autoComplete="username"
                  placeholder={t.auth.forgotPassword.registerNumberPlaceholder}
                  value={registerNumber}
                  onChange={(event) => {
                    setRegisterNumber(event.target.value);
                    setError(null);
                  }}
                  required
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="pt-1">
                <Button className="w-full" type="submit" disabled={isSubmitting || !registerNumber.trim()}>
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                  {t.auth.forgotPassword.sendOtpLabel}
                </Button>
              </div>
            </form>
          ) : step === "verify" ? (
            <form className="space-y-5" onSubmit={handleVerifyOtp}>
              <div className="flex items-start gap-3 rounded-xl border border-line bg-brand/5 p-3">
                <Mail className="mt-0.5 size-5 shrink-0 text-brand" />
                <p className="text-sm text-ink">{formatTemplate(t.auth.forgotPassword.otpSentTemplate, { email: maskedEmail })}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="forgot-otp-input" className="text-center block">
                  {t.profile.otpLabel}
                </Label>
                <InputOTP
                  id="forgot-otp-input"
                  maxLength={6}
                  value={otp}
                  onChange={(value) => setOtp(value.replace(/\D/g, ""))}
                  containerClassName="justify-center"
                  autoFocus
                >
                  <InputOTPGroup>
                    {Array.from({ length: 6 }, (_, i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="size-11 text-lg font-semibold text-brand data-[active=true]:border-brand"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
              <div className="pt-1">
                <Button className="w-full" type="submit" disabled={isSubmitting || otp.length !== 6}>
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                  {t.profile.verifyOtpLabel}
                </Button>
              </div>
            </form>
          ) : step === "reset" ? (
            <form className="space-y-4" onSubmit={handleReset}>
              <div className="space-y-2">
                <Label htmlFor="forgot-new-password">{t.profile.newPasswordLabel}</Label>
                <Input
                  id="forgot-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="forgot-confirm-password">{t.profile.confirmPasswordLabel}</Label>
                <Input
                  id="forgot-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="pt-1">
                <Button className="w-full" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                  {t.profile.updatePasswordLabel}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <p className="text-sm text-sub">{t.auth.forgotPassword.successDescription}</p>
              <Button className="w-full" onClick={() => onOpenChange(false)}>
                {t.auth.forgotPassword.backToLogin}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
