"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Fires a one-time confirmation toast after an account deletion redirect.
 * Rendered by the login page only when `?deleted=1` is present, so it doesn't
 * need to read search params itself.
 */
export function AccountDeletedToast() {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    toast.success("Account deleted", {
      description: "Everything tied to it has been removed.",
    });
  }, []);
  return null;
}
