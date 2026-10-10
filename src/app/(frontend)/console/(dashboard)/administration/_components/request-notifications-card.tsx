"use client";

import { BellRing, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRequestNotifyEmail, setRequestNotifyEmail } from "@/lib/data-source";
import { useConsoleSchoolId } from "@/lib/hooks/console-data";
import type { ConsoleStaffProfile } from "@/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Administrator-only. Every ACTIVE administrator is always emailed about
 * new exchange / subject-change requests; this card adds one more inbox
 * that receives EVERY update (new requests and every decision). Type an
 * address or pick an existing staff member.
 */
export function RequestNotificationsCard({ staffList }: { staffList: ConsoleStaffProfile[] | undefined }) {
  const schoolId = useConsoleSchoolId();
  const { data: saved, mutate } = useSWR(schoolId ? ["console:request-notify-email", schoolId] : null, () =>
    getRequestNotifyEmail(schoolId),
  );
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const value = draft ?? saved ?? "";
  const dirty = draft !== null && draft.trim().toLowerCase() !== (saved ?? "");
  const invalid = value.trim() !== "" && !EMAIL_PATTERN.test(value.trim());
  const pickable = (staffList ?? []).filter((member) => member.status !== "disabled");

  async function save(next: string) {
    setSaving(true);
    try {
      const stored = await setRequestNotifyEmail(schoolId, next);
      await mutate(stored, { revalidate: false });
      setDraft(null);
      toast.success(stored ? `Updates will also go to ${stored}.` : "Extra notification email removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the email.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="size-4" />
          Request notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-sub">
          New exchange, subject-change and parent-support requests are emailed to every active administrator. Add one more inbox below
          to also receive <strong className="text-ink">every update</strong> — new requests and each decision.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="request-notify-email" className="text-xs text-sub">
              Extra notification email
            </Label>
            <Input
              id="request-notify-email"
              type="email"
              placeholder="office@yourschool.edu.in"
              value={value}
              onChange={(e) => setDraft(e.target.value)}
              aria-invalid={invalid}
            />
            {invalid ? <p className="text-xs text-destructive">Enter a valid email address.</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-sub">…or pick a staff member</Label>
            <Select value="" onValueChange={(email) => setDraft(email)} disabled={pickable.length === 0}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={pickable.length === 0 ? "No staff yet" : "Choose from staff list"} />
              </SelectTrigger>
              <SelectContent>
                {pickable.map((member) => (
                  <SelectItem key={member.id} value={member.email}>
                    {member.name} — {member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button disabled={!dirty || invalid || saving || !schoolId} onClick={() => save(value)}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
          {saved ? (
            <Button variant="outline" disabled={saving} onClick={() => save("")}>
              Remove extra email
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
