import type { Metadata } from "next";
import Link from "next/link";
import { ALL_BOOKS } from "@/lib/mock/books";
import { ALL_UNIFORM_ITEMS } from "@/lib/mock/uniform";
import { PolicyPage, PolicySection } from "@/components/public/policy-page";

export const metadata: Metadata = { title: "Products & Pricing | Niraj Public School", description: "School book sets, uniforms, kits and current catalogue prices." };

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export default function ProductsPricingPage() {
  const bookPrices = ALL_BOOKS.map((book) => book.price);
  const uniformPrices = ALL_UNIFORM_ITEMS.flatMap((item) => item.sizeOptions.map((option) => option.price));
  return <PolicyPage title="Products & Pricing">
    <p>The Niraj Public School portal is used to order school book sets, uniforms and school kits for eligible students. Families may also see school programme registrations and fees when a programme is available. Items are collected from the school campus; nothing is shipped.</p>
    <PolicySection title="Book sets"><p>Class-specific book and fee sets are priced by class and selected academic language, stream and elective. Current catalogue data lists book sets from {money(Math.min(...bookPrices))} to {money(Math.max(...bookPrices))}. The exact applicable amount is shown after the student's class and options are selected.</p></PolicySection>
    <PolicySection title="Uniforms and kits"><p>Uniform garments and school kit items are sold as listed in the class catalogue. Current catalogue data lists individual uniform and kit items from {money(Math.min(...uniformPrices))} to {money(Math.max(...uniformPrices))}. Some entries are sets of two; the item description and checkout show the applicable price.</p></PolicySection>
    <PolicySection title="Programmes"><p>Programme registrations and fees are shown only when the school publishes an available programme. No fixed programme price is advertised here because fees and availability depend on the programme.</p></PolicySection>
    <PolicySection title="Final price"><p>Catalogue prices can change as the school updates its offerings. The price shown in the portal at checkout is the amount payable for that order. Visit the <Link className="text-brand underline" href="/login">student portal</Link> to view the current catalogue and applicable prices.</p></PolicySection>
  </PolicyPage>;
}
