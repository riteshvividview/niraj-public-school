"use client";

import { Loader2, Lock, Mail } from "lucide-react";
import Link from "next/link";
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

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const profile = await loginUser(email.trim(), password);
      login(profile);
      router.push("/home");
    } catch {
      setError(t.auth.login.invalidCredentials);
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      imageSrc="https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=1200&q=80&auto=format&fit=crop"
      imageAlt="Students collaborating together at school"
      eyebrow="Welcome back"
      title={t.auth.login.title}
      subtitle={t.auth.login.subtitle}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">{t.auth.login.emailLabel}</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-sub" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t.auth.login.emailPlaceholder}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
              aria-invalid={error ? true : undefined}
              className={cn("pl-9", error && "border-destructive")}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t.auth.login.passwordLabel}</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-sub" />
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
              className={cn("pl-9", error && "border-destructive")}
              required
            />
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="submit" size="lg" className="w-full gap-2" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {t.auth.login.submit}
        </Button>

        <p className="text-center text-sm text-sub">
          {t.auth.login.newHere}{" "}
          <Link href="/register" className="font-medium text-brand hover:underline">
            {t.auth.login.createAccountCta}
          </Link>
        </p>
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
