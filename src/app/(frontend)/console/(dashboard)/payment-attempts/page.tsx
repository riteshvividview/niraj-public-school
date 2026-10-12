import { redirect } from "next/navigation";

/** Moved: this screen is now a tab of Requests. The old address keeps working. */
export default function Page() {
  redirect("/console/requests?tab=payment-attempts");
}
