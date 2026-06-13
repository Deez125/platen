import Link from "next/link";
import type { ReactNode } from "react";

import { BRAND } from "@/lib/config/brand";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <Link href="/" className="mb-8 text-lg font-semibold tracking-tight text-foreground">
        {BRAND.name}
      </Link>
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
