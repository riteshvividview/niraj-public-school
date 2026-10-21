import type { Metadata } from "next";
import { PolicyPage, PolicySection } from "@/components/public/policy-page";

export const metadata: Metadata = { title: "Contact Us | Niraj Public School", description: "Contact Niraj Public School for portal orders, payments and collection." };

export default function ContactPage() {
  return <PolicyPage title="Contact Us">
    <p>Contact Niraj Public School for help with portal access, orders, payments, programme registration or school collection.</p>
    <PolicySection title="School contact"><address className="not-italic">
      <p className="font-semibold text-ink">Niraj Public School</p>
      <p>6-3-864, Saadat Manzil, Ameerpet, Hyderabad, Telangana 500016, India</p>
      <p>Phone: <a className="text-brand underline" href="tel:+914023413543">+91 40 2341 3543</a></p>
      <p>Email: <a className="text-brand underline" href="mailto:info@nirajpublicschool.com">info@nirajpublicschool.com</a></p>
      <p>Hours: Monday to Saturday, 8:00 AM–4:00 PM</p>
    </address></PolicySection>
    <PolicySection title="Campus collection"><p>Orders are collected at the school campus in Hyderabad. Please contact the school for directions or collection timing before visiting.</p></PolicySection>
    <PolicySection title="When you contact us"><p>For an order or payment question, include the order number or payment reference and the student's class. Do not include card details, UPI PINs or passwords in an email or message.</p></PolicySection>
  </PolicyPage>;
}
