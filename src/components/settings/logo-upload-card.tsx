"use client";

import { ImageIcon, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Ring } from "@/components/ui/ring";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export type LogoKind = "square" | "wide";

type Props = {
  orgId: string;
  kind: LogoKind;
  title: string;
  description: string;
  /** DB column to update — supabase column name. */
  column: "logo_url" | "logo_wide_url";
  initialUrl: string | null;
};

export function LogoUploadCard({ orgId, kind, title, description, column, initialUrl }: Props) {
  const router = useRouter();
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handlePick() {
    if (busy) return;
    inputRef.current?.click();
  }

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Not an image", { description: "Use PNG, JPG, WebP, or SVG." });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("File too large", { description: "Logos must be under 2 MB." });
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${orgId}/${kind}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("org-logos")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      toast.error("Upload failed", { description: uploadError.message });
      setBusy(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("org-logos").getPublicUrl(path);
    const finalUrl = `${publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("organizations")
      .update({ [column]: finalUrl })
      .eq("id", orgId);

    if (updateError) {
      toast.error("Saved upload but couldn't update org", {
        description: updateError.message,
      });
      setBusy(false);
      return;
    }

    setUrl(finalUrl);
    toast.success("Logo updated");
    router.refresh();
    setBusy(false);
  }

  async function handleRemove() {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();

    // Remove every file matching this kind regardless of extension.
    const { data: files } = await supabase.storage.from("org-logos").list(orgId);
    const matching = (files ?? []).filter((f) => f.name.startsWith(`${kind}.`));
    if (matching.length > 0) {
      const paths = matching.map((f) => `${orgId}/${f.name}`);
      const { error: removeError } = await supabase.storage.from("org-logos").remove(paths);
      if (removeError) {
        toast.error("Couldn't remove old file", { description: removeError.message });
        setBusy(false);
        return;
      }
    }

    const { error: updateError } = await supabase
      .from("organizations")
      .update({ [column]: null })
      .eq("id", orgId);

    if (updateError) {
      toast.error("Couldn't clear logo", { description: updateError.message });
      setBusy(false);
      return;
    }

    setUrl(null);
    toast.success("Logo removed");
    router.refresh();
    setBusy(false);
  }

  const previewBoxClass =
    kind === "square"
      ? "size-20 shrink-0 rounded-md border border-border bg-muted/40"
      : "h-20 w-48 shrink-0 rounded-md border border-border bg-muted/40";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className={cn("flex items-center justify-center overflow-hidden", previewBoxClass)}>
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt={`${title} preview`}
                className={cn("size-full", kind === "square" ? "object-cover" : "object-contain")}
              />
            ) : (
              <ImageIcon className="size-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePick}
                disabled={busy}
                className="gap-1.5"
              >
                {busy ? (
                  <Ring size="sm" className="text-current" />
                ) : (
                  <>
                    <Upload className="size-3.5" />
                    {url ? "Change" : "Upload"}
                  </>
                )}
              </Button>
              {url ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRemove}
                  disabled={busy}
                  className="gap-1.5 text-muted-foreground"
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {busy ? "Working…" : "PNG, JPG, WebP, or SVG — up to 2 MB."}
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
