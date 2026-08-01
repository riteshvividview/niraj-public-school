"use client";

import { Camera, ChevronRight, HelpCircle, Loader2, LogOut } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/shared/app-header";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/context";
import { getClassLevelById, getSchoolById, updateUserAvatar } from "@/lib/data-source";
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

function AvatarUpload() {
  const { t } = useTranslation();
  const { profile, login } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !profile) return;

    setError(null);
    setIsUploading(true);
    try {
      const updated = await updateUserAvatar(profile.id, file);
      login(updated);
    } catch {
      setError(t.profile.avatarUploadError);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        aria-label={t.profile.changePhoto}
        className="relative flex size-20 items-center justify-center overflow-hidden rounded-full bg-section-workspace-bg font-heading text-2xl font-bold text-brand ring-4 ring-card transition-opacity disabled:opacity-70"
      >
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded avatar, arbitrary local/remote origin, next/image would need per-deploy remotePatterns config
          <img src={profile.avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          profile.name.charAt(0).toUpperCase()
        )}
        {isUploading ? (
          <span className="absolute inset-0 flex items-center justify-center bg-ink/40">
            <Loader2 className="size-5 animate-spin text-white" />
          </span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        aria-label={t.profile.changePhoto}
        className="absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full border-2 border-card bg-brand text-white shadow-sm transition-transform hover:scale-105 disabled:opacity-70"
      >
        <Camera className="size-3.5" />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
      />
      {error ? <p className="mt-2 text-center text-xs text-destructive">{error}</p> : null}
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
      <div className="mx-auto max-w-2xl space-y-5 p-4 pb-8 sm:space-y-6 sm:p-6 lg:p-8">
        <section className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-card p-5 text-center sm:p-6">
          <AvatarUpload />
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
