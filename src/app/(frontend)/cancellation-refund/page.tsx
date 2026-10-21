import type { Metadata } from "next";
import { PolicyPage, PolicySection } from "@/components/public/policy-page";

export const metadata: Metadata = { title: "Cancellation & Refund Policy | Niraj Public School", description: "Cancellation and refund information for portal orders and programme fees." };

export default function CancellationRefundPage() {
  return <PolicyPage title="Cancellation & Refund Policy">
    <p>This policy applies to book, uniform and kit orders, and programme fees paid through the Niraj Public School portal.</p>
    <PolicySection title="Requesting a cancellation"><p>Contact the school as soon as possible with the student's name, order or payment reference, and the reason for the request. A request is not confirmed until the school acknowledges it. Orders already prepared, handed over, or programme activities already delivered may not be cancellable.</p></PolicySection>
    <PolicySection title="Refund eligibility"><p>If the school approves a cancellation, or an order cannot be fulfilled, the school will arrange a refund for the eligible amount to the original payment method. Any amount already settled for a service or item that has been supplied is not refundable except where required by applicable law or agreed by the school.</p></PolicySection>
    <PolicySection title="Processing time"><p>Once approved, the school initiates the refund through the payment provider. The time for the credit to appear depends on the provider and the bank or payment method. If a payment is debited but the portal does not show a confirmed order, contact the school with the transaction reference before making another payment.</p></PolicySection>
    <PolicySection title="How to contact us"><p>Use the phone number or email on the Contact Us page. Include the order number or payment reference so the school can trace the transaction.</p></PolicySection>
  </PolicyPage>;
}
