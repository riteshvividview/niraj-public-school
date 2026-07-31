"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OtpStep } from "../_components/otp-step";
import { useTranslation } from "@/i18n/context";
import { createUserProfile, findUserByMobile, getClassLevelsBySchool, getSchools } from "@/lib/data-source";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth-store";
import type { ClassLevel, School } from "@/types";

const MOBILE_REGEX = /^[6-9]\d{9}$/;

type Step = "form" | "otp";

interface FormErrors {
  name?: string;
  mobile?: string;
  school?: string;
  classLevel?: string;
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useTranslation();
  const { login } = useAuth();

  const [step, setStep] = useState<Step>("form");
  const [schools, setSchools] = useState<School[] | null>(null);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState(searchParams.get("mobile") ?? "");
  const [schoolId, setSchoolId] = useState("");
  const [classLevelId, setClassLevelId] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getSchools().then((result) => {
      setSchools(result);
      if (result.length === 1) setSchoolId(result[0].id);
    });
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    getClassLevelsBySchool(schoolId).then(setClassLevels);
  }, [schoolId]);

  async function handleSendOtp() {
    setAlreadyRegistered(false);
    const nextErrors: FormErrors = {};
    if (!name.trim()) nextErrors.name = t.auth.errors.required;
    if (!MOBILE_REGEX.test(mobile)) nextErrors.mobile = t.auth.errors.invalidMobile;
    if (!schoolId) nextErrors.school = t.auth.errors.selectSchool;
    if (!classLevelId) nextErrors.classLevel = t.auth.errors.selectClass;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    const existing = await findUserByMobile(`+91${mobile}`);
    setIsSubmitting(false);
    if (existing) {
      setAlreadyRegistered(true);
      return;
    }
    setStep("otp");
  }

  async function handleVerified() {
    const fullMobile = `+91${mobile}`;
    try {
      const profile = await createUserProfile({
        name: name.trim(),
        mobileNumber: fullMobile,
        role: "parent",
        schoolId,
        classLevelId,
        preferredLanguage: language,
      });
      login(profile);
    } catch {
      // Backend unreachable — degrade to a locally-generated profile so the
      // demo flow still completes; the record just won't exist in Payload.
      const now = new Date().toISOString();
      login({
        id: `user-${Date.now()}`,
        name: name.trim(),
        mobileNumber: fullMobile,
        role: "parent",
        schoolId,
        classLevelId,
        preferredLanguage: language,
        createdAt: now,
        updatedAt: now,
      });
    }
    router.push("/home");
  }

  if (step === "otp") {
    return (
      <OtpStep
        mobileDisplay={`+91 ${mobile}`}
        onVerified={handleVerified}
        onChangeNumber={() => setStep("form")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="font-heading text-2xl font-bold text-ink">{t.auth.register.title}</h1>
        <p className="text-sm text-sub">{t.auth.register.subtitle}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t.auth.register.nameLabel}</Label>
          <Input
            id="name"
            placeholder={t.auth.register.namePlaceholder}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            aria-invalid={errors.name ? true : undefined}
            className={cn(errors.name && "border-destructive")}
          />
          {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="mobile">{t.auth.register.mobileLabel}</Label>
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
                setErrors((prev) => ({ ...prev, mobile: undefined }));
                setAlreadyRegistered(false);
              }}
              aria-invalid={errors.mobile ? true : undefined}
              className={cn(errors.mobile && "border-destructive")}
            />
          </div>
          {errors.mobile ? <p className="text-sm text-destructive">{errors.mobile}</p> : null}
        </div>

        <div className="space-y-2">
          <Label>{t.auth.register.schoolLabel}</Label>
          <Select
            value={schoolId}
            onValueChange={(value) => {
              setSchoolId(value);
              setClassLevelId("");
              setErrors((prev) => ({ ...prev, school: undefined }));
            }}
          >
            <SelectTrigger className={cn("w-full", errors.school && "border-destructive")}>
              <SelectValue placeholder={schools === null ? "…" : t.auth.register.schoolLabel} />
            </SelectTrigger>
            <SelectContent>
              {(schools ?? []).map((school) => (
                <SelectItem key={school.id} value={school.id}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.school ? <p className="text-sm text-destructive">{errors.school}</p> : null}
        </div>

        <div className="space-y-2">
          <Label>{t.auth.register.classLabel}</Label>
          <Select
            value={classLevelId}
            onValueChange={(value) => {
              setClassLevelId(value);
              setErrors((prev) => ({ ...prev, classLevel: undefined }));
            }}
            disabled={!schoolId || classLevels.length === 0}
          >
            <SelectTrigger className={cn("w-full", errors.classLevel && "border-destructive")}>
              <SelectValue placeholder={t.auth.register.classPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {classLevels.map((level) => (
                <SelectItem key={level.id} value={level.id}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.classLevel ? <p className="text-sm text-destructive">{errors.classLevel}</p> : null}
        </div>
      </div>

      {alreadyRegistered ? (
        <div className="rounded-2xl border border-line bg-muted p-4 text-sm">
          <p className="text-ink">{t.auth.register.alreadyRegistered}</p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href={`/login?mobile=${mobile}`}>{t.auth.register.loginInsteadCta}</Link>
          </Button>
        </div>
      ) : null}

      <Button className="w-full" onClick={handleSendOtp} disabled={isSubmitting}>
        {t.auth.register.sendOtp}
      </Button>

      <p className="text-center text-sm text-sub">
        {t.auth.register.haveAccount}{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          {t.auth.register.loginCta}
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
