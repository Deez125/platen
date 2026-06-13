import { headers } from "next/headers";

import type { Platform } from "@/components/providers/platform-provider";

export async function detectPlatformFromHeaders(): Promise<Platform> {
  const h = await headers();

  // Modern client hints (Chromium-based browsers send this).
  const sec = h.get("sec-ch-ua-platform")?.toLowerCase().replaceAll('"', "") ?? "";
  if (sec === "macos" || sec === "ios") return "mac";
  if (sec === "windows" || sec === "linux" || sec === "android" || sec === "chromeos") {
    return "windows";
  }

  // Fallback: sniff user-agent.
  const ua = h.get("user-agent")?.toLowerCase() ?? "";
  if (ua.includes("mac") || ua.includes("iphone") || ua.includes("ipad")) return "mac";
  return "windows";
}
