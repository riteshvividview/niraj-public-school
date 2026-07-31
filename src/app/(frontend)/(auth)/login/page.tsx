"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpStep } from "../_components/otp-step";
import { useTranslation } from "@/i18n/context";
import { findUserByMobile } from "@/lib/data-source";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth-store";
import type { UserProfile } from "@/types";

const MOBILE_REGEX = /^[6-9]\d{9}$/;

type Step = "mobile" | "otp";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { login } = useAuth();

  const [step, setStep] = useState<Step>("mobile");
  const [mobile, setMobile] = useState(searchParams.get("mobile") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [foundProfile, setFoundProfile] = useState<UserProfile | null>(null);

  async function handleSendOtp() {
    setNotFound(false);
    if (!MOBILE_REGEX.test(mobile)) {
      setError(t.auth.errors.invalidMobile);
      return;
    }
    setError(null);
    setIsChecking(true);
    const user = await findUserByMobile(`+91${mobile}`);
    setIsChecking(false);
    if (!user) {
      setNotFound(true);
      return;
    }
    setFoundProfile(user);
    setStep("otp");
  }

  function handleVerified() {
    if (foundProfile) {
      login(foundProfile);
      router.push("/home");
    }
  }

  if (step === "otp") {
    return (
      <OtpStep
        mobileDisplay={`+91 ${mobile}`}
        onVerified={handleVerified}
        onChangeNumber={() => setStep("mobile")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="font-heading text-2xl font-bold text-ink">{t.auth.login.title}</h1>
        <p className="text-sm text-sub">{t.auth.login.subtitle}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mobile">{t.auth.login.mobileLabel}</Label>
        <div className="flex items-center gap-2">
          <span className="flex h-9 items-center rounded-lg border border-line bg-muted px-3 text-sm text-sub">
            +91
          </span>
          <Input
            id="mobile"
            inputMode="numeric"
            maxLength={10}
            placeholder={t.auth.login.mobilePlaceholder}
            value={mobile}
            onChange={(event) => {
              setMobile(event.target.value.replace(/\D/g, "").slice(0, 10));
              setError(null);
              setNotFound(false);
            }}
            aria-invalid={error ? true : undefined}
            className={cn(error && "border-destructive")}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      {notFound ? (
        <div className="rounded-2xl border border-line bg-muted p-4 text-sm">
          <p className="text-ink">{t.auth.login.notFound}</p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href={`/register?mobile=${mobile}`}>{t.auth.login.createAccountCta}</Link>
          </Button>
        </div>
      ) : null}

      <Button className="w-full" onClick={handleSendOtp} disabled={mobile.length !== 10 || isChecking}>
        {t.auth.login.sendOtp}
      </Button>

      <p className="text-center text-sm text-sub">
        {t.auth.login.newHere}{" "}
        <Link href="/register" className="font-medium text-brand hover:underline">
          {t.auth.login.createAccountCta}
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
