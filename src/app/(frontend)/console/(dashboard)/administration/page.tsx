"use client";

import { Plus, RotateCcw, ShieldCheck, ShieldOff, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { ConsoleListSkeleton } from "@/components/shared/console-list-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CooldownError,
  forceConsoleStaffReverification,
  getConsoleStaffList,
  inviteConsoleStaff,
  resendConsoleStaffInvite,
  setConsoleStaffRole,
  setConsoleStaffStatus,
} from "@/lib/data-source";
import { formatDate } from "@/lib/format";
import { useConsoleAuth } from "@/store/console-auth-store";
import type { ConsoleStaffProfile } from "@/types";

const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

function StatusBadge({ status }: { status: ConsoleStaffProfile["status"] }) {
  if (status === "active") return <Badge variant="secondary">Active</Badge>;
  if (status === "invited") return <Badge variant="outline">Invited</Badge>;
  return <Badge variant="destructive">Disabled</Badge>;
}

export default function AdministrationPage() {
  const router = useRouter();
  const { staff: currentStaff, isReady } = useConsoleAuth();

  useEffect(() => {
    if (isReady && currentStaff && currentStaff.role !== "administrator") {
      router.replace("/console");
    }
  }, [isReady, currentStaff, router]);

  const { data: staffList, mutate: refreshStaff } = useSWR(
    currentStaff?.role === "administrator" ? "console:administration:staff" : null,
    getConsoleStaffList,
  );

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ staff: ConsoleStaffProfile; kind: "disable" | "reverify" } | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  // staffId -> epoch ms when its "Resend invite" button unlocks again — Brevo
  // (and most transactional-email providers) reject sending the same
  // recipient two messages back-to-back, so this mirrors the server's own
  // cooldown (src/app/(payload)/api/console-auth/invite/route.ts) in the UI.
  const [resendCooldowns, setResendCooldowns] = useState<Record<string, number>>({});
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    if (Object.keys(resendCooldowns).length === 0) return;
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [resendCooldowns]);

  if (!isReady || (currentStaff && currentStaff.role !== "administrator")) {
    return null;
  }

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    setIsInviting(true);
    try {
      await inviteConsoleStaff(name.trim(), email.trim().toLowerCase());
      toast.success("Invite sent");
      setAddOpen(false);
      setName("");
      setEmail("");
      refreshStaff();
    } catch (error) {
      if (error instanceof CooldownError) {
        toast.error(error.message);
      } else {
        toast.error(error instanceof Error ? error.message : "Couldn't send that invite.");
      }
    } finally {
      setIsInviting(false);
    }
  }

  async function handleResend(target: ConsoleStaffProfile) {
    setResendingId(target.id);
    try {
      await resendConsoleStaffInvite(target.name, target.email);
      toast.success("Invite re-sent");
      setResendCooldowns((c) => ({ ...c, [target.id]: Date.now() + RESEND_COOLDOWN_MS }));
    } catch (error) {
      if (error instanceof CooldownError) {
        setResendCooldowns((c) => ({ ...c, [target.id]: Date.now() + error.retryAfterSeconds * 1000 }));
        toast.error(error.message);
      } else {
        toast.error(error instanceof Error ? error.message : "Couldn't resend that invite.");
      }
    } finally {
      setResendingId(null);
    }
  }

  async function handleRoleToggle(target: ConsoleStaffProfile) {
    const nextRole = target.role === "administrator" ? "staff" : "administrator";
    try {
      await setConsoleStaffRole(target.id, nextRole);
      toast.success(nextRole === "administrator" ? "Promoted to administrator" : "Demoted to staff");
      refreshStaff();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't change that account's role.");
    }
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;
    const { staff: target, kind } = pendingAction;
    try {
      if (kind === "disable") {
        const nextStatus = target.status === "disabled" ? "active" : "disabled";
        await setConsoleStaffStatus(target.id, nextStatus);
        toast.success(nextStatus === "disabled" ? "Access disabled" : "Access restored");
      } else {
        await forceConsoleStaffReverification(target.id);
        toast.success("Every device on this account now needs to re-verify");
      }
      refreshStaff();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-ink">
            <ShieldCheck className="size-6" />
            Administration
          </h1>
          <p className="text-sm text-sub">
            Who can sign in to this Console — invite a colleague by email instead of sharing a password.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setAddOpen(true)}>
          <UserPlus className="size-4" />
          Add Staff
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {!staffList ? (
            <ConsoleListSkeleton />
          ) : (
            <div className="space-y-2">
              {staffList.map((member) => {
                const isSelf = member.id === currentStaff?.id;
                const isResending = resendingId === member.id;
                const cooldownEndsAt = resendCooldowns[member.id];
                const cooldownSecondsLeft = cooldownEndsAt ? Math.max(0, Math.ceil((cooldownEndsAt - nowTick) / 1000)) : 0;
                const resendDisabled = isResending || cooldownSecondsLeft > 0;
                return (
                  <div key={member.id} className="rounded-xl border border-line/60 p-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-ink">{member.name}</p>
                          {member.role === "administrator" ? <Badge variant="secondary">Administrator</Badge> : null}
                          <StatusBadge status={member.status} />
                        </div>
                        <p className="text-sm text-sub">{member.email}</p>
                        <p className="mt-1 text-xs text-sub">
                          {member.invitedByEmail ? `Invited by ${member.invitedByEmail}` : "Original account"}
                          {member.lastLoginAt ? ` · Last login ${formatDate(member.lastLoginAt)}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {member.status === "invited" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            disabled={resendDisabled}
                            onClick={() => handleResend(member)}
                          >
                            <Plus className="size-3.5" />
                            {isResending ? "Sending…" : cooldownSecondsLeft > 0 ? `Resend in ${cooldownSecondsLeft}s` : "Resend invite"}
                          </Button>
                        ) : null}
                        {member.status !== "invited" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setPendingAction({ staff: member, kind: "reverify" })}
                          >
                            <RotateCcw className="size-3.5" />
                            Force re-verification
                          </Button>
                        ) : null}
                        {!isSelf && member.status !== "invited" ? (
                          <Button variant="outline" size="sm" onClick={() => handleRoleToggle(member)}>
                            {member.role === "administrator" ? "Demote to staff" : "Promote to administrator"}
                          </Button>
                        ) : null}
                        {!isSelf ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setPendingAction({ staff: member, kind: "disable" })}
                          >
                            <ShieldOff className="size-3.5" />
                            {member.status === "disabled" ? "Restore access" : "Disable access"}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
              {staffList.length === 0 ? <p className="py-6 text-center text-sm text-sub">No staff accounts yet.</p> : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleInvite}>
            <div className="space-y-2">
              <Label htmlFor="staff-name">Name</Label>
              <Input id="staff-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <p className="text-xs text-sub">
              They&apos;ll get an email with a verification code and a link to set their own password — nothing to
              share on your end.
            </p>
            <DialogFooter>
              <Button type="submit" disabled={isInviting}>
                {isInviting ? "Sending…" : "Send invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={pendingAction !== null}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title={pendingAction?.kind === "reverify" ? "Force re-verification?" : pendingAction?.staff.status === "disabled" ? "Restore access?" : "Disable access?"}
        description={
          pendingAction?.kind === "reverify"
            ? `Every device signed in as ${pendingAction.staff.name} will need a fresh email code on its next login.`
            : pendingAction?.staff.status === "disabled"
              ? `${pendingAction?.staff.name} will be able to sign in again.`
              : `${pendingAction?.staff.name} will not be able to sign in until this is reversed.`
        }
        confirmLabel={pendingAction?.kind === "reverify" ? "Force re-verification" : pendingAction?.staff.status === "disabled" ? "Restore access" : "Disable access"}
        onConfirm={confirmPendingAction}
      />
    </div>
  );
}
