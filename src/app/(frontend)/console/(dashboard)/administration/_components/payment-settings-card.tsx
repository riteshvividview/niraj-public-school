"use client";

import { Copy, Loader2, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPaymentProviderInfo, getPaymentSettings, setPaymentSettings } from "@/lib/data-source";
import { useConsoleSchoolId } from "@/lib/hooks/console-data";

/**
 * Administrator-only. Shows which payment provider is live (and what is still
 * missing for a real one), and sets the two safety rules:
 *   • duplicate window — the same items can't be paid for again within N minutes (0 = off)
 *   • pending timeout — how long a started-but-unfinished payment blocks a second attempt
 */
export function PaymentSettingsCard() {
  const schoolId = useConsoleSchoolId();
  const { data: provider } = useSWR("console:payment-provider", () => getPaymentProviderInfo());
  const { data: saved, mutate } = useSWR(schoolId ? ["console:payment-settings", schoolId] : null, () => getPaymentSettings(schoolId));
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [timeout, setTimeoutValue] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const duplicateValue = duplicate ?? String(saved?.duplicateWindowMinutes ?? 30);
  const timeoutValue = timeout ?? String(saved?.pendingTimeoutMinutes ?? 30);
  const dupNumber = Number(duplicateValue);
  const timeoutNumber = Number(timeoutValue);
  const dupInvalid = duplicateValue.trim() === "" || !Number.isInteger(dupNumber) || dupNumber < 0 || dupNumber > 1440;
  const timeoutInvalid = timeoutValue.trim() === "" || !Number.isInteger(timeoutNumber) || timeoutNumber < 5 || timeoutNumber > 1440;
  const dirty = saved !== undefined && (dupNumber !== saved.duplicateWindowMinutes || timeoutNumber !== saved.pendingTimeoutMinutes);

  async function save() {
    setSaving(true);
    try {
      const stored = await setPaymentSettings(schoolId, { duplicateWindowMinutes: dupNumber, pendingTimeoutMinutes: timeoutNumber });
      await mutate(stored, { revalidate: false });
      setDuplicate(null);
      setTimeoutValue(null);
      toast.success("Payment settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="size-4" />
          Payments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2 rounded-lg border border-line p-3.5 text-sm">
          <p className="font-medium text-ink">
            Payment provider:{" "}
            <span className={provider?.testMode || !provider?.available ? "text-section-programs" : "text-section-essentials"}>
              {provider ? provider.label : "…"}
            </span>
          </p>
          {provider?.testMode ? (
            <p className="text-sub">
              No real payment provider is connected, so checkout runs in <strong className="text-ink">test mode</strong> and no real money moves. To go
              live, add the HDFC SmartGateway details to the server settings (<code>HDFC_API_KEY</code>, <code>HDFC_MERCHANT_ID</code>,{" "}
              <code>HDFC_PAYMENT_PAGE_CLIENT_ID</code>, <code>HDFC_WEBHOOK_USERNAME</code>, <code>HDFC_WEBHOOK_PASSWORD</code>) and restart — nothing
              else needs to change.
            </p>
          ) : null}
          {provider && !provider.available ? (
            <p className="text-section-pay">
              Online payments are switched OFF for parents until these are set: <strong>{provider.missingKeys.join(", ")}</strong>.
            </p>
          ) : null}
          {provider && !provider.testMode && provider.sandbox ? (
            <p className="text-section-programs">This is pointed at the bank&apos;s <strong>sandbox</strong> — payments are not real until <code>HDFC_BASE_URL</code> is removed.</p>
          ) : null}
          {provider && !provider.testMode && provider.webhookMissing.length > 0 ? (
            <p className="text-section-programs">
              Still to set for the webhook: <strong>{provider.webhookMissing.join(", ")}</strong>. Payments work without it, but a payment whose screen closed can
              then only be confirmed when the parent opens My payments.
            </p>
          ) : null}
          {provider && !provider.testMode ? (
            <div className="space-y-1.5">
              <p className="text-sub">
                {provider.webhookNote} The webhook is what confirms a payment when the parent&apos;s screen closed before it finished.
              </p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1.5 text-xs">{provider.webhookUrl}</code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(provider.webhookUrl);
                    toast.success("Webhook address copied.");
                  }}
                >
                  <Copy className="size-4" /> Copy
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pay-dup-window" className="text-xs text-sub">
              Block a repeat payment for the same items (minutes)
            </Label>
            <Input id="pay-dup-window" inputMode="numeric" value={duplicateValue} onChange={(e) => setDuplicate(e.target.value)} aria-invalid={dupInvalid} />
            <p className="text-xs text-sub">
              If a parent pays for exactly the same items again within this time, they are told &quot;You already paid for this&quot; and shown the receipt.
              Different items are never blocked. <strong className="text-ink">0 turns this off.</strong>
            </p>
            {dupInvalid ? <p className="text-xs text-destructive">Enter a whole number from 0 to 1440.</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-timeout" className="text-xs text-sub">
              Payment-in-progress timeout (minutes)
            </Label>
            <Input id="pay-timeout" inputMode="numeric" value={timeoutValue} onChange={(e) => setTimeoutValue(e.target.value)} aria-invalid={timeoutInvalid} />
            <p className="text-xs text-sub">
              While a payment is in progress the parent can&apos;t start another one. After this long without a result it times out — after checking with the
              provider that no money arrived.
            </p>
            {timeoutInvalid ? <p className="text-xs text-destructive">Enter a whole number from 5 to 1440.</p> : null}
          </div>
        </div>

        <Button disabled={!dirty || dupInvalid || timeoutInvalid || saving || !schoolId} onClick={save}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Save
        </Button>
      </CardContent>
    </Card>
  );
}
