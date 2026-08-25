"use client";

import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n/context";
import { formatTemplate } from "@/i18n/format";

type Step = "request" | "verify" | "reset";

async function postJson(url: string, body?: unknown): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return res.ok ? { ok: true } : { ok: false, error: json.error ?? "Something went wrong." };
}

export function ChangePasswordDialog({
  email,
  open,
  onOpenChange,
}: {
  email?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("request");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setStep("request");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setIsSubmitting(false);
  }

  async function handleSendOtp() {
    setError(null);
    setIsSubmitting(true);
    const result = await postJson("/api/otp/request");
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? t.profile.otpInvalid);
      return;
    }
    setStep("verify");
  }

  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await postJson("/api/otp/verify", { otp });
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
    const result = await postJson("/api/password/reset", { newPassword });
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Couldn't update your password.");
      return;
    }
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.profile.changePasswordLabel}</DialogTitle>
        </DialogHeader>

        {!email ? (
          <p className="text-sm text-sub">{t.profile.changePasswordNoEmail}</p>
        ) : step === "request" ? (
          <div className="space-y-4">
            <p className="text-sm text-sub">{formatTemplate(t.profile.changePasswordEmailNotice, { email })}</p>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button onClick={handleSendOtp} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {t.profile.sendOtpLabel}
              </Button>
            </DialogFooter>
          </div>
        ) : step === "verify" ? (
          <form className="space-y-4" onSubmit={handleVerifyOtp}>
            <p className="text-sm text-section-essentials">{t.profile.otpSent}</p>
            <div className="space-y-2">
              <Label htmlFor="otp-input">{t.profile.otpLabel}</Label>
              <Input
                id="otp-input"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder={t.profile.otpPlaceholder}
                autoFocus
                required
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting || otp.length !== 6}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {t.profile.verifyOtpLabel}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleReset}>
            <div className="space-y-2">
              <Label htmlFor="new-password">{t.profile.newPasswordLabel}</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t.profile.confirmPasswordLabel}</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {t.profile.updatePasswordLabel}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
