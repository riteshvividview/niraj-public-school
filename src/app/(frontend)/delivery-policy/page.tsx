import type { Metadata } from "next";
import { PolicyPage, PolicySection } from "@/components/public/policy-page";

export const metadata: Metadata = { title: "Delivery Policy | Niraj Public School", description: "Collection arrangements for items ordered through the school portal." };

export default function DeliveryPage() {
  return <PolicyPage title="Delivery Policy">
    <p>Niraj Public School does not ship items purchased through this portal. There is no courier or home delivery service.</p>
    <PolicySection title="Where to collect"><p>Books, uniforms and kits are collected in person at Niraj Public School, 6-3-864, Saadat Manzil, Ameerpet, Hyderabad, Telangana 500016. The school will share collection timing and any specific collection instructions after the order is ready. Please contact the school before travelling if you have not received a readiness update.</p></PolicySection>
    <PolicySection title="Collection by a parent or guardian"><p>Bring the order or receipt details so staff can verify the purchase. If someone else will collect on your behalf, contact the school in advance to confirm what verification is required.</p></PolicySection>
    <PolicySection title="Collection questions"><p>For collection status or campus directions, contact the school using the details on the Contact Us page.</p></PolicySection>
  </PolicyPage>;
}
