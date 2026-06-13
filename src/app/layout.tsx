import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { BfcacheReloader } from "@/components/providers/bfcache-reloader";
import { PlatformProvider } from "@/components/providers/platform-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BRAND } from "@/lib/config/brand";
import { detectPlatformFromHeaders } from "@/lib/platform-server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.tagline,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialPlatform = await detectPlatformFromHeaders();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <BfcacheReloader />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <QueryProvider>
            <PlatformProvider initialPlatform={initialPlatform}>
              <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
              <Toaster closeButton position="top-right" />
            </PlatformProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
