"use client";

import { usePDF } from "@react-pdf/renderer";
import { useEffect, useMemo } from "react";

import { type PdfQuote, QuotePdfDocument } from "@/lib/pdf/quote-pdf";

/**
 * Renders the canonical quote PDF off-screen and reports the resulting blob
 * URL via `onChange`. Mounted (invisibly) on the quote page so the PDF is
 * always pre-rendered — opening the Preview Sheet is then just "point an
 * iframe at this URL," not "load a megabyte of code and render a PDF."
 *
 * Driven by a debounced `quote` upstream so we don't re-render on every
 * keystroke.
 */
export function QuotePdfBlobRenderer({
  quote,
  onChange,
}: {
  quote: PdfQuote;
  onChange: (url: string | null) => void;
}) {
  const document = useMemo(() => <QuotePdfDocument quote={quote} />, [quote]);
  const [instance, updateInstance] = usePDF({ document });

  // usePDF's update is imperative: when the document reference changes, tell
  // it to re-render.
  useEffect(() => {
    updateInstance(document);
  }, [document, updateInstance]);

  // Publish the current blob URL upward whenever it changes.
  useEffect(() => {
    onChange(instance.url ?? null);
  }, [instance.url, onChange]);

  return null;
}
