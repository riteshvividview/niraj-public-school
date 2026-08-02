"use client";

import { IdCard, Info, Loader2, Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n/context";
import { loginUser } from "@/lib/data-source";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth-store";
import { AuthShell } from "../_components/auth-shell";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { login } = useAuth();

  const [registerNumber, setRegisterNumber] = useState(searchParams.get("registerNumber") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const profile = await loginUser(registerNumber.trim(), password);
      login(profile);
      router.push("/home");
    } catch {
      setError(t.auth.login.invalidCredentials);
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      imageSrc="/loginPageImg.jpg"
      imageAlt="School children in uniform"
      eyebrow="Welcome back"
      title={t.auth.login.title}
      subtitle={t.auth.login.subtitle}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="register-number">{t.auth.login.registerNumberLabel}</Label>
          <div className="relative">
            <IdCard className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-sub" />
            <Input
              id="register-number"
              autoComplete="username"
              autoFocus
              placeholder={t.auth.login.registerNumberPlaceholder}
              value={registerNumber}
              onChange={(event) => {
                setRegisterNumber(event.target.value);
                setError(null);
              }}
              aria-invalid={error ? true : undefined}
              className={cn("h-11 pl-10 text-sm sm:h-12 sm:text-base", error && "border-destructive")}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t.auth.login.passwordLabel}</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-sub" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder={t.auth.login.passwordPlaceholder}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
              aria-invalid={error ? true : undefined}
              className={cn("h-11 pl-10 text-sm sm:h-12 sm:text-base", error && "border-destructive")}
              required
            />
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button
          type="submit"
          size="lg"
          className="h-11 w-full cursor-pointer gap-2 text-sm sm:h-12 sm:text-base"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {t.auth.login.submit}
        </Button>

        <div className="flex items-start gap-2.5 rounded-2xl border border-dashed border-line bg-muted/60 p-3.5 text-xs text-sub sm:text-sm">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>{t.auth.login.cantLogIn}</p>
        </div>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
