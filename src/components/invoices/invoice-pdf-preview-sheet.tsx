"use client";

import { Download, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Ring } from "@/components/ui/ring";
import { Sheet, SheetContent } from "@/components/ui/sheet";

/**
 * Invoice PDF preview — the invoice equivalent of <QuotePdfPreviewSheet>. Since
 * an invoice is always saved, we point the iframe straight at the server route
 * (/api/invoices/[id]/pdf) and use the same URL for download + print. The hash
 * params hide the browser viewer's toolbar and fit the page to the iframe.
 */
const VIEWER_PARAMS = "#toolbar=0&navpanes=0&scrollbar=0&view=Fit&zoom=page-fit";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Server PDF URL, e.g. /api/invoices/{id}/pdf. */
  url: string;
  invoiceNumber: string;
};

export function InvoicePdfPreviewSheet({ open, onOpenChange, url, invoiceNumber }: Props) {
  const fileName = `${invoiceNumber || "invoice"}.pdf`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="!w-[92vw] !max-w-[92vw] flex flex-col gap-0 p-0 sm:!max-w-[88vw] lg:!max-w-[1000px]"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="text-sm font-medium">
            Preview · <span className="text-muted-foreground">{invoiceNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a href={url} download={fileName}>
                <Download className="size-3.5" /> Download
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a href={url} target="_blank" rel="noreferrer">
                <Printer className="size-3.5" /> Print
              </a>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 bg-muted/30">
          {open ? (
            <iframe
              src={`${url}${VIEWER_PARAMS}`}
              title={`Invoice ${invoiceNumber}`}
              className="size-full border-0"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Ring size="lg" />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
