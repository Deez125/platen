"use client";

import { Download, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Ring } from "@/components/ui/ring";
import { Sheet, SheetContent } from "@/components/ui/sheet";

/**
 * Shows the *already-rendered* quote PDF via a plain iframe — the PDF is
 * generated in the background by <QuotePdfBlobRenderer>, so opening this
 * Sheet has no significant work to do. The hash params hide the browser
 * viewer's own toolbar and tell it to fit the full page in the iframe, which
 * auto-resizes when the window resizes.
 */
const VIEWER_PARAMS = "#toolbar=0&navpanes=0&scrollbar=0&view=Fit&zoom=page-fit";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** The PDF blob URL produced by the background renderer. */
  blobUrl: string | null;
  /** Shown in the Sheet title. */
  quoteNumber: string;
  /** When the quote is saved, a stable server URL preferred for download/print. */
  savedUrl?: string;
};

export function QuotePdfPreviewSheet({
  open,
  onOpenChange,
  blobUrl,
  quoteNumber,
  savedUrl,
}: Props) {
  const fileName = `${quoteNumber || "quote"}.pdf`;
  // Prefer the API URL for downloads when the quote is saved (stable + shareable);
  // fall back to the in-memory blob URL for unsaved drafts.
  const downloadHref = savedUrl ?? blobUrl ?? undefined;
  const disabled = !downloadHref;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="!w-[92vw] !max-w-[92vw] flex flex-col gap-0 p-0 sm:!max-w-[88vw] lg:!max-w-[1000px]"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="text-sm font-medium">
            Preview · <span className="text-muted-foreground">{quoteNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5" disabled={disabled}>
              <a
                href={downloadHref ?? "#"}
                download={fileName}
                aria-disabled={disabled}
                onClick={(e) => {
                  if (disabled) e.preventDefault();
                }}
              >
                <Download className="size-3.5" /> Download
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5" disabled={disabled}>
              <a
                href={downloadHref ?? "#"}
                target="_blank"
                rel="noreferrer"
                aria-disabled={disabled}
                onClick={(e) => {
                  if (disabled) e.preventDefault();
                }}
              >
                <Printer className="size-3.5" /> Print
              </a>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 bg-muted/30">
          {blobUrl ? (
            <iframe
              src={`${blobUrl}${VIEWER_PARAMS}`}
              title={`Quote ${quoteNumber}`}
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
