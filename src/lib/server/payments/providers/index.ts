import type { PaymentProvider } from "../types";
import { razorpayProvider } from "./razorpay";
import { simulatedProvider } from "./simulated";

const ALL: Record<string, PaymentProvider> = { simulated: simulatedProvider, razorpay: razorpayProvider };

/**
 * Which provider is live. PAYMENT_PROVIDER wins when set ("simulated" | "razorpay");
 * otherwise Razorpay as soon as its keys exist, else the simulated stand-in. A
 * provider that is chosen but missing its keys is returned as-is and reported as
 * not configured — it never silently falls back to taking "pretend" payments.
 */
export function getActiveProvider(): PaymentProvider {
  const wanted = (process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase();
  if (wanted && ALL[wanted]) return ALL[wanted];
  if (razorpayProvider.isConfigured()) return razorpayProvider;
  return simulatedProvider;
}

/** A payment keeps the provider it started with — status checks and webhooks must use that one. */
export function getProviderById(id: string): PaymentProvider | null {
  return ALL[id] ?? null;
}
