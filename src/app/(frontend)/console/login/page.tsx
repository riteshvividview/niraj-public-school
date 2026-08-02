"use client";

import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { DEMO_STAFF_EMAIL, DEMO_STAFF_PASSWORD, useConsoleAuth } from "@/store/console-auth-store";

export default function ConsoleLoginPage() {
  const router = useRouter();
  const { login } = useConsoleAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (email.trim().toLowerCase() === DEMO_STAFF_EMAIL && password === DEMO_STAFF_PASSWORD) {
      setError(null);
      login({ name: "School Admin", email: DEMO_STAFF_EMAIL });
      router.push("/console/catalogue");
      return;
    }
    setError("Incorrect email or password.");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-section-console-bg px-6 py-10">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-line bg-card p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-section-console text-white">
            <ShieldCheck className="size-6" />
          </div>
          <h1 className="font-heading text-xl font-bold text-ink">School Console</h1>
          <p className="text-sm text-sub">Staff sign-in — School Workspace</p>
        </div>

        <div className="rounded-xl border border-dashed border-line bg-muted p-3 text-center text-xs text-sub">
          Demo login — {DEMO_STAFF_EMAIL} / {DEMO_STAFF_PASSWORD}
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
              className={cn(error && "border-destructive")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
              className={cn(error && "border-destructive")}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full">
            Log in
          </Button>
        </form>
      </div>
    </div>
  );
}
