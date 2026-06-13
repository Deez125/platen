"use client";

import { type ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";

export type Platform = "mac" | "windows";

type PlatformContextValue = {
  platform: Platform;
  detected: Platform;
  setPlatform: (p: Platform) => void;
  isOverridden: boolean;
  resetToDetected: () => void;
};

const PlatformContext = createContext<PlatformContextValue | null>(null);

// Legacy storage key from an older build that persisted the override.
// We clean it up on mount so refreshes always fall through to auto-detect.
const LEGACY_STORAGE_KEY = "platform-override";

function detectPlatformFromNavigator(): Platform {
  if (typeof navigator === "undefined") return "mac";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac") || ua.includes("iphone") || ua.includes("ipad")) return "mac";
  return "windows";
}

export function PlatformProvider({
  children,
  initialPlatform,
}: {
  children: ReactNode;
  initialPlatform: Platform;
}) {
  const [platform, setPlatformState] = useState<Platform>(initialPlatform);
  const [detected, setDetected] = useState<Platform>(initialPlatform);
  const [isOverridden, setIsOverridden] = useState(false);

  useEffect(() => {
    // Always wipe the legacy persisted override so refreshes return to auto-detect.
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // ignore (private mode, etc.)
    }

    // Reconcile against client-side detection in case the server header was missing or wrong.
    const clientDetected = detectPlatformFromNavigator();
    setDetected(clientDetected);
    if (clientDetected !== platform) {
      setPlatformState(clientDetected);
    }
    // Only run on mount — explicitly do not include `platform` in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<PlatformContextValue>(
    () => ({
      platform,
      detected,
      isOverridden,
      setPlatform: (p) => {
        setPlatformState(p);
        setIsOverridden(p !== detected);
      },
      resetToDetected: () => {
        setPlatformState(detected);
        setIsOverridden(false);
      },
    }),
    [platform, detected, isOverridden],
  );

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used inside <PlatformProvider>");
  return ctx;
}
