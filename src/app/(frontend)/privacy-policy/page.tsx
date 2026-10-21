import type { Metadata } from "next";
import { PolicyPage, PolicySection } from "@/components/public/policy-page";

export const metadata: Metadata = { title: "Privacy Policy | Niraj Public School", description: "How Niraj Public School handles information used in its online portal." };

export default function PrivacyPage() {
  return <PolicyPage title="Privacy Policy">
    <p>This policy explains how Niraj Public School uses information when families access the school portal, place an order, register for a programme, or contact the school.</p>
    <PolicySection title="Information we use"><p>The portal may process a student's name, register number, class and school-related selections; a parent's or student's contact details; order, collection and payment-status records; and information sent in a support request. We use this information to provide portal access, fulfil orders, manage programmes, respond to questions, maintain school records and protect the service.</p></PolicySection>
    <PolicySection title="Payments"><p>Online payments are handled by the payment provider shown at checkout. The portal receives transaction references and payment status needed to reconcile an order. Payment credentials such as card details, UPI PINs and banking passwords should be entered only on the provider's secure payment flow and are not requested by school staff.</p></PolicySection>
    <PolicySection title="Sharing and retention"><p>We share relevant information with service providers that support portal hosting, communication and payment processing, and with authorised school personnel who need it to administer school services. We do not sell student or family personal information. Records are kept for as long as needed for school administration, accounting, support and applicable legal obligations.</p></PolicySection>
    <PolicySection title="Security and your choices"><p>We use access controls and operational safeguards appropriate to the portal. No online service can guarantee absolute security. Contact the school to ask about information associated with your account or to request correction of inaccurate contact details, subject to school recordkeeping requirements.</p></PolicySection>
    <PolicySection title="Children and contact"><p>The portal is intended for use by students and their parents or guardians for school purposes. Parents or guardians may contact the school with privacy questions or concerns using the details on the Contact Us page. This policy may be updated and the current version will be available here.</p></PolicySection>
  </PolicyPage>;
}
