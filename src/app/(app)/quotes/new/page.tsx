import { redirect } from "next/navigation";

import { QuoteBuilder } from "@/components/quotes/quote-builder";
import { getOrgPdfInfo, getQuoteRefData } from "@/lib/quotes/ref-data";

export default async function NewQuotePage() {
  const [refData, org] = await Promise.all([getQuoteRefData(), getOrgPdfInfo()]);
  if (!refData || !org) redirect("/onboarding");
  return <QuoteBuilder refData={refData} org={org} />;
}
