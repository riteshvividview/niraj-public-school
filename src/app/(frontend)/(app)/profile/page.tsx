"use client";

import { ChevronRight, HelpCircle, LogOut } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/shared/app-header";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/context";
import { getClassLevelById, getSchoolById } from "@/lib/data-source";
import { useAuth } from "@/store/auth-store";
import type { ClassLevel, School } from "@/types";

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-3 last:border-b-0">
      <span className="text-sm text-sub">{label}</span>
      <span className="text-sm font-medium text-ink">{value}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { profile, logout } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [classLevel, setClassLevel] = useState<ClassLevel | null>(null);

  useEffect(() => {
    if (!profile) return;
    getSchoolById(profile.schoolId).then(setSchool);
    getClassLevelById(profile.classLevelId).then(setClassLevel);
  }, [profile]);

  if (!profile) return null;

  return (
    <>
      <AppHeader title={t.nav.profile} />
      <div className="space-y-6 p-4 pb-8">
        <section className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-card p-6 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-section-workspace-bg font-heading text-xl font-bold text-brand">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <p className="font-heading text-lg font-bold text-ink">{profile.name}</p>
        </section>

        <section className="rounded-2xl border border-line bg-card px-4">
          <ProfileRow label={t.profile.emailLabel} value={profile.email} />
          {profile.mobileNumber ? (
            <ProfileRow label={t.profile.mobileLabel} value={profile.mobileNumber} />
          ) : null}
          <ProfileRow label={t.profile.schoolLabel} value={school?.name ?? "…"} />
          <ProfileRow label={t.profile.classLabel} value={classLevel?.label ?? "…"} />
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-sub">{t.profile.languageLabel}</span>
            <LanguageSwitcher />
          </div>
        </section>

        <Link
          href="/help"
          className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4"
        >
          <HelpCircle className="size-5 text-sub" />
          <span className="flex-1 text-sm font-medium text-ink">{t.help.title}</span>
          <ChevronRight className="size-4 text-sub" />
        </Link>

        <Button variant="outline" className="w-full gap-2" onClick={logout}>
          <LogOut className="size-4" />
          {t.profile.logout}
        </Button>
      </div>
    </>
  );
}
