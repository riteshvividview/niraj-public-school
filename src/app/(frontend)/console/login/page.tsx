"use client";

import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConsoleForgotPasswordDialog } from "../_components/console-forgot-password-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { payloadLogin } from "@/lib/data-source/payload-rest";
import { cn } from "@/lib/utils";
import { useConsoleAuth } from "@/store/console-auth-store";

interface PrecheckResponse {
  ok: boolean;
  requiresOtp: boolean;
  error?: string;
}
interface SimpleResponse {
  ok: boolean;
  error?: string;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Something went wrong.");
  return data;
}

export default function ConsoleLoginPage() {
  const router = useRouter();
  const { refresh } = useConsoleAuth();

  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  async function finishLogin() {
    await payloadLogin("payload-admins", { email: email.trim().toLowerCase(), password });
    await refresh();
    router.push("/console/catalogue");
  }

  async function handleCredentialsSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await postJson<PrecheckResponse>("/api/console-auth/precheck", { email, password });
      if (result.requiresOtp) {
        setStep("otp");
      } else {
        await finishLogin();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOtpSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await postJson<SimpleResponse>("/api/console-auth/verify-device-otp", { email, password, otp });
      await finishLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    try {
      await postJson<PrecheckResponse>("/api/console-auth/precheck", { email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't resend the code.");
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-section-console-bg px-6 py-10">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-line bg-card p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-section-console text-white">
            <ShieldCheck className="size-6" />
          </div>
          <h1 className="font-heading text-xl font-bold text-ink">School Console</h1>
          <p className="text-sm text-sub">
            {step === "credentials" ? "Staff sign-in — School Workspace" : "Enter the code we emailed you"}
          </p>
        </div>

        {step === "credentials" ? (
          <form className="space-y-4" onSubmit={handleCredentialsSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-sub" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError(null);
                  }}
                  className={cn("pl-10", error && "border-destructive")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-sub" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError(null);
                  }}
                  className={cn("pl-10 pr-10", error && "border-destructive")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute top-1/2 right-3.5 -translate-y-1/2 text-sub transition-colors hover:text-ink"
                >
                  {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="text-xs font-medium text-brand hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Checking…" : "Log in"}
            </Button>
            <p className="text-center text-xs text-sub">
              First time here?{" "}
              <Link href="/console/accept-invite" className="text-brand underline-offset-2 hover:underline">
                Activate your invite
              </Link>
            </p>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleOtpSubmit}>
            <p className="text-center text-xs text-sub">
              We don&apos;t recognize this device — we sent a 6-digit code to <strong>{email}</strong>.
            </p>
            <div className="space-y-2">
              <Label htmlFor="otp">6-digit code</Label>
              <Input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(event) => {
                  setOtp(event.target.value.replace(/\D/g, ""));
                  setError(null);
                }}
                className={cn("text-center tracking-[0.4em]", error && "border-destructive")}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={isSubmitting || otp.length !== 6}>
              {isSubmitting ? "Verifying…" : "Verify & log in"}
            </Button>
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                className="text-sub underline-offset-2 hover:underline"
                onClick={() => {
                  setStep("credentials");
                  setOtp("");
                  setError(null);
                }}
              >
                Back
              </button>
              <button type="button" className="text-brand underline-offset-2 hover:underline" onClick={handleResend}>
                Resend code
              </button>
            </div>
          </form>
        )}
      </div>

      <ConsoleForgotPasswordDialog
        open={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
        onPasswordReset={(resetEmail) => {
          setEmail(resetEmail);
          setPassword("");
          setError(null);
        }}
      />
    </div>
  );
}
