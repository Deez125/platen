"use client";

import { Check, Copy, Eye, EyeOff, KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function JoinKeyCard({ joinKey }: { joinKey: string }) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // Fully mask every character (including dashes) while hidden.
  const masked = "•".repeat(joinKey.length);

  async function copy() {
    try {
      await navigator.clipboard.writeText(joinKey);
      setCopied(true);
      toast.success("Join key copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-muted-foreground" />
          <CardTitle>Join key</CardTitle>
        </div>
        <CardDescription>
          Share this key with teammates. They enter it during signup to join your shop.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <code className="flex h-9 flex-1 items-center rounded-md border border-border bg-muted/40 px-3 font-mono text-sm tracking-wider">
            {revealed ? joinKey : masked}
          </code>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Hide join key" : "Show join key"}
          >
            {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </Button>
          <Button size="sm" variant="outline" onClick={copy} className="gap-1.5">
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
