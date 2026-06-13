"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Ring } from "@/components/ui/ring";
import { generateInvoice } from "@/lib/actions/invoices";

/**
 * Shown on an approved quote's detail page. If the quote already has an invoice,
 * it links to it; otherwise it generates one and navigates there.
 */
export function GenerateInvoiceButton({
  quoteId,
  status,
  existingInvoiceId,
}: {
  quoteId: string;
  status: string;
  existingInvoiceId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (existingInvoiceId) {
    return (
      <Button size="sm" variant="outline" asChild className="gap-1.5">
        <Link href={`/invoices/${existingInvoiceId}`}>
          <FileText className="size-3.5" /> View invoice
        </Link>
      </Button>
    );
  }

  if (status !== "approved") return null;

  async function handleGenerate() {
    setBusy(true);
    const result = await generateInvoice(quoteId);
    setBusy(false);
    if (!result.ok) {
      toast.error("Couldn't generate invoice", { description: result.error });
      return;
    }
    toast.success("Invoice generated");
    router.push(`/invoices/${result.invoiceId}`);
  }

  return (
    <Button size="sm" onClick={handleGenerate} disabled={busy} className="gap-1.5">
      {busy ? <Ring size="sm" className="text-current" /> : <FileText className="size-3.5" />}
      Generate invoice
    </Button>
  );
}
