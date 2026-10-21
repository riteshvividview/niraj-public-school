import Link from "next/link";

const links = [
  ["Terms & Conditions", "/terms-and-conditions"],
  ["Privacy Policy", "/privacy-policy"],
  ["Cancellation & Refunds", "/cancellation-refund"],
  ["Delivery Policy", "/delivery-policy"],
  ["Products & Pricing", "/products-pricing"],
  ["Contact Us", "/contact"],
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface px-5 py-6">
      <nav aria-label="Policies and school information" className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-5 gap-y-3 text-xs text-sub">
        {links.map(([label, href]) => <Link key={href} className="hover:text-ink" href={href}>{label}</Link>)}
      </nav>
      <p className="mt-4 text-center text-xs text-sub">© {new Date().getFullYear()} Niraj Public School</p>
    </footer>
  );
}
