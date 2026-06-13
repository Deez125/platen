"use client";

import { ImagePlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Ring } from "@/components/ui/ring";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

type LiveProps = {
  customerId: string;
  tenantId: string;
  initialUrl: string | null;
};

type StagedProps = {
  file: File | null;
  onFileChange: (file: File | null) => void;
};

type Props = LiveProps | StagedProps;

function isLive(p: Props): p is LiveProps {
  return "customerId" in p;
}

function validate(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    toast.error("Not an image", { description: "Use PNG, JPG, WebP, or SVG." });
    return false;
  }
  if (file.size > MAX_BYTES) {
    toast.error("File too large", { description: "Logos must be under 2 MB." });
    return false;
  }
  return true;
}

export function CustomerLogoCard(props: Props) {
  if (isLive(props)) {
    return <LiveLogoCard {...props} />;
  }
  return <StagedLogoCard {...props} />;
}

function LiveLogoCard({ customerId, tenantId, initialUrl }: LiveProps) {
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
    if (!validate(file)) return;

    setBusy(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${tenantId}/${customerId}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("customer-logos")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      toast.error("Upload failed", { description: uploadError.message });
      setBusy(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("customer-logos").getPublicUrl(path);
    const finalUrl = `${publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("customers")
      .update({ logo_url: finalUrl })
      .eq("id", customerId);

    if (updateError) {
      toast.error("Saved upload but couldn't update customer", {
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

    const folder = `${tenantId}/${customerId}`;
    const { data: files } = await supabase.storage.from("customer-logos").list(folder);
    if (files && files.length > 0) {
      const paths = files.map((f) => `${folder}/${f.name}`);
      const { error: removeError } = await supabase.storage.from("customer-logos").remove(paths);
      if (removeError) {
        toast.error("Couldn't remove old file", { description: removeError.message });
        setBusy(false);
        return;
      }
    }

    const { error: updateError } = await supabase
      .from("customers")
      .update({ logo_url: null })
      .eq("id", customerId);

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

  return (
    <LogoCardShell
      previewUrl={url}
      busy={busy}
      onPick={handlePick}
      onRemove={handleRemove}
      inputRef={inputRef}
      onInputChange={handleChange}
    />
  );
}

function StagedLogoCard({ file, onFileChange }: StagedProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handlePick() {
    inputRef.current?.click();
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    if (!validate(picked)) return;
    onFileChange(picked);
  }

  function handleRemove() {
    onFileChange(null);
  }

  return (
    <LogoCardShell
      previewUrl={previewUrl}
      busy={false}
      onPick={handlePick}
      onRemove={handleRemove}
      inputRef={inputRef}
      onInputChange={handleChange}
    />
  );
}

type ShellProps = {
  previewUrl: string | null;
  busy: boolean;
  onPick: () => void;
  onRemove: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

function LogoCardShell({
  previewUrl,
  busy,
  onPick,
  onRemove,
  inputRef,
  onInputChange,
}: ShellProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Logo</CardTitle>
        <CardDescription>
          Their company logo. Shown on quotes and invoices we send to them.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative w-fit">
          <button
            type="button"
            onClick={onPick}
            disabled={busy}
            className={cn(
              "flex size-24 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-md border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted disabled:cursor-default",
              previewUrl ? "border-border" : "border-dashed border-border",
            )}
          >
            {busy ? (
              <Ring size="sm" className="text-current" />
            ) : previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Customer logo" className="size-full object-contain" />
            ) : (
              <>
                <ImagePlus className="size-6" />
                <span className="text-[10px]">Add logo</span>
              </>
            )}
          </button>
          {previewUrl && !busy ? (
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove logo"
              className="absolute -top-2 -right-2 cursor-pointer rounded-full border border-border bg-background p-1 text-muted-foreground shadow-sm transition-colors hover:text-destructive"
            >
              <X className="size-3" />
            </button>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={onInputChange}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {busy ? "Working…" : "PNG, JPG, WebP, or SVG — up to 2 MB."}
        </p>
      </CardContent>
    </Card>
  );
}
