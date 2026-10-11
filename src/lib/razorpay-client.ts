/**
 * Browser-only. Loads Razorpay's checkout script on demand (once) — it is only
 * ever requested when the server says Razorpay is the live provider.
 */
export interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
  timeout?: number;
  handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
}

export interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", handler: (response: { error?: { description?: string } }) => void): void;
}

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

let loading: Promise<RazorpayConstructor> | null = null;

export function loadRazorpay(): Promise<RazorpayConstructor> {
  const existing = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
  if (existing) return Promise.resolve(existing);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => {
        const ctor = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
        if (ctor) resolve(ctor);
        else reject(new Error("The payment window could not be loaded."));
      };
      script.onerror = () => {
        loading = null;
        reject(new Error("The payment window could not be loaded. Check your internet connection."));
      };
      document.head.appendChild(script);
    });
  }
  return loading;
}
