import type { PaymentMethod } from "@/types";

export interface PaymentResult {
  success: boolean;
}

/**
 * Stands in for a real gateway (Razorpay/Stripe — see CLAUDE.md, out of
 * scope until a later, non-Phase-1-10 build stage). Isolated on purpose:
 * swapping in a real gateway later means replacing this function's body,
 * not touching the checkout UI that calls it. The failure message shown to
 * the user lives in the UI layer (i18n), not here — this just reports
 * success/failure.
 */
export async function simulatePayment(
  _method: PaymentMethod,
  options?: { forceFailure?: boolean },
): Promise<PaymentResult> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return { success: !options?.forceFailure };
}
