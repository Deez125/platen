"use client";

import { useEffect } from "react";

/**
 * Force a hard reload on browser back/forward navigation.
 *
 * Listens in CAPTURE phase so this runs before Next.js's router intercepts
 * popstate to do soft navigation.
 *
 * Trade-off: back navigation always reloads. Acceptable vs. dropdowns and
 * tooltips refusing to open after a back nav.
 */
export function BfcacheReloader() {
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      // Bfcache restore: browser preserved the page, JS is paused.
      if (event.persisted) {
        console.log("[nav] pageshow persisted → reload");
        window.location.reload();
      }
    }
    function handlePopState() {
      console.log("[nav] popstate → reload");
      window.location.reload();
    }
    window.addEventListener("pageshow", handlePageShow);
    // capture: true so we run before Next's router handler.
    window.addEventListener("popstate", handlePopState, true);
    console.log("[nav] BfcacheReloader mounted, listeners attached");
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePopState, true);
    };
  }, []);

  return null;
}
