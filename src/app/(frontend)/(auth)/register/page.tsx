"use client";

import { Loader2, Lock, Mail, User } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/i18n/context";
import { getClassLevelsBySchool, getSchools, registerUser } from "@/lib/data-source";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth-store";
import type { ClassLevel, School } from "@/types";
import { AuthShell } from "../_components/auth-shell";

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  school?: string;
  classLevel?: string;
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useTranslation();
  const { login } = useAuth();

  const [schools, setSchools] = useState<School[] | null>(null);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setAlreadyRegistered(false);
    const nextErrors: FormErrors = {};
    if (!name.trim()) nextErrors.name = t.auth.errors.required;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = t.auth.errors.invalidEmail;
    if (password.length < 8) nextErrors.password = t.auth.errors.passwordTooShort;
    if (password !== confirmPassword) nextErrors.confirmPassword = t.auth.errors.passwordMismatch;
    if (!schoolId) nextErrors.school = t.auth.errors.selectSchool;
    if (!classLevelId) nextErrors.classLevel = t.auth.errors.selectClass;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const profile = await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role: "parent",
        schoolId,
        classLevelId,
        preferredLanguage: language,
      });
      login(profile);
      router.push("/home");
    } catch {
      setAlreadyRegistered(true);
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      imageSrc="https://commons.wikimedia.org/wiki/Special:FilePath/School_children_in_a_classroom_in_Tel_Aviv_(FL61797978).jpg?width=1200"
      imageAlt="School children sitting together in a classroom"
      eyebrow="Join Niraj Public School"
      title={t.auth.register.title}
      subtitle={t.auth.register.subtitle}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="name">{t.auth.register.nameLabel}</Label>
          <div className="relative">
            <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-sub" />
            <Input
              id="name"
              placeholder={t.auth.register.namePlaceholder}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              aria-invalid={errors.name ? true : undefined}
              className={cn("pl-9", errors.name && "border-destructive")}
            />
          </div>
          {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t.auth.register.emailLabel}</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-sub" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t.auth.register.emailPlaceholder}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrors((prev) => ({ ...prev, email: undefined }));
                setAlreadyRegistered(false);
              }}
              aria-invalid={errors.email ? true : undefined}
              className={cn("pl-9", errors.email && "border-destructive")}
            />
          </div>
          {errors.email ? <p className="text-sm text-destructive">{errors.email}</p> : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="password">{t.auth.register.passwordLabel}</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-sub" />
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder={t.auth.register.passwordPlaceholder}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                aria-invalid={errors.password ? true : undefined}
                className={cn("pl-9", errors.password && "border-destructive")}
              />
            </div>
            {errors.password ? <p className="text-sm text-destructive">{errors.password}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t.auth.register.confirmPasswordLabel}</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-sub" />
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                aria-invalid={errors.confirmPassword ? true : undefined}
                className={cn("pl-9", errors.confirmPassword && "border-destructive")}
              />
            </div>
            {errors.confirmPassword ? (
              <p className="text-sm text-destructive">{errors.confirmPassword}</p>
            ) : null}
          </div>
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

        {alreadyRegistered ? (
          <div className="rounded-2xl border border-line bg-muted p-4 text-sm">
            <p className="text-ink">{t.auth.register.alreadyRegistered}</p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href={`/login?email=${encodeURIComponent(email)}`}>
                {t.auth.register.loginInsteadCta}
              </Link>
            </Button>
          </div>
        ) : null}

        <Button type="submit" size="lg" className="w-full gap-2" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {t.auth.register.submit}
        </Button>

        <p className="text-center text-sm text-sub">
          {t.auth.register.haveAccount}{" "}
          <Link href="/login" className="font-medium text-brand hover:underline">
            {t.auth.register.loginCta}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
