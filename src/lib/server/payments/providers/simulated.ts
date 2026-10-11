import type { PaymentProvider, PaymentRow, ProviderOutcome } from "../types";

/**
 * The stand-in used until a real gateway's keys are added. It behaves like a
 * gateway that confirms later: the "gateway side" outcome is stored on the
 * payment's providerPaymentId by /api/payments/simulate (sim_ok_… = money
 * taken, sim_fail_… = declined) and fetchStatus reads it back — so the whole
 * pending → confirmed-by-status-check path can be exercised, including the
 * "money taken but the screen died" case.
 */
export const simulatedProvider: PaymentProvider = {
  id: "simulated",
  label: "Test mode (no real payments)",
  testMode: true,
  isConfigured: () => true,

  async createCheckout({ payment }) {
    return { providerOrderId: `sim_${payment.id}`, checkout: { type: "simulated" } };
  },

  async resumeCheckout() {
    return { type: "simulated" };
  },

  async verifyClientConfirmation(payment): Promise<ProviderOutcome | null> {
    return this.fetchStatus(payment);
  },

  async fetchStatus(payment: PaymentRow): Promise<ProviderOutcome> {
    const ref = payment.providerPaymentId ?? "";
    if (ref.startsWith("sim_ok_")) return { state: "paid", providerPaymentId: ref, method: payment.method };
    if (ref.startsWith("sim_fail_")) return { state: "failed", reason: "The (test) payment was declined." };
    return { state: "pending" };
  },

  verifyWebhook() {
    return null; // the simulated gateway has no webhook
  },
};
