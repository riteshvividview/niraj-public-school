import type { Metadata } from "next";
import { PolicyPage, PolicySection } from "@/components/public/policy-page";

export const metadata: Metadata = { title: "Terms & Conditions | Niraj Public School", description: "Terms for using the Niraj Public School student and parent portal." };

export default function TermsPage() {
  return <PolicyPage title="Terms & Conditions">
    <p>These terms apply when parents or students use the Niraj Public School online portal to view school items, place orders, register for available programmes, or make payments. By using the portal, you agree to these terms.</p>
    <PolicySection title="What the portal offers"><p>The portal may offer class-specific book sets, school uniforms and kits, and school programmes when available. Descriptions, eligibility, availability and current prices are shown in the catalogue or at checkout. Programme dates, fees and availability may change; a programme is offered only when listed as open.</p></PolicySection>
    <PolicySection title="Orders and payment"><p>Please check the student, class, selected items, quantities and total before paying. An order is placed after successful payment confirmation. A payment authorisation or pending transaction alone does not confirm an order. Do not retry a pending payment until its status is clear; contact the school if you need help.</p><p>Payments are processed by the payment provider displayed at checkout. The school does not ask you to share your card, UPI PIN or banking password with school staff.</p></PolicySection>
    <PolicySection title="Collection and availability"><p>Items sold through this portal are collected from the school. They are not shipped or delivered to a home address. Collection instructions and readiness updates are provided through the portal or by the school. Please bring the order or receipt details when collecting.</p></PolicySection>
    <PolicySection title="Accurate account information"><p>Use the portal only for a student connected to the school and keep contact details accurate so the school can send order and account updates. You are responsible for activity carried out through your account and for keeping your sign-in details private.</p></PolicySection>
    <PolicySection title="Help and changes"><p>For order, programme or portal questions, contact the school using the details on the Contact Us page. These terms may be updated when the portal or school process changes; the current version will be published here.</p></PolicySection>
  </PolicyPage>;
}
