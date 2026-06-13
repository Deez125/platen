"use client";

import { Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ring } from "@/components/ui/ring";
import { updateProfileName } from "@/lib/actions/profile";
import { createClient } from "@/lib/supabase/browser";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

type Props = {
  userId: string;
  firstName: string;
  lastName: string;
  initialAvatarUrl: string | null;
};

export function ProfileCard({ userId, firstName, lastName, initialAvatarUrl }: Props) {
  const router = useRouter();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [firstNameInput, setFirstNameInput] = useState(firstName);
  const [lastNameInput, setLastNameInput] = useState(lastName);
  const [nameSaving, setNameSaving] = useState(false);

  const initials = ((firstNameInput[0] ?? "") + (lastNameInput[0] ?? "")).toUpperCase() || "?";

  function handlePick() {
    if (avatarBusy) return;
    inputRef.current?.click();
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Not an image", { description: "Use PNG, JPG, or WebP." });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("File too large", {
        description: "Profile pictures must be under 2 MB.",
      });
      return;
    }

    setAvatarBusy(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      toast.error("Upload failed", { description: uploadError.message });
      setAvatarBusy(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    const finalUrl = `${publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: finalUrl })
      .eq("id", userId);

    if (updateError) {
      toast.error("Saved upload but couldn't update profile", {
        description: updateError.message,
      });
      setAvatarBusy(false);
      return;
    }

    setAvatarUrl(finalUrl);
    toast.success("Profile picture updated");
    router.refresh();
    setAvatarBusy(false);
  }

  async function handleAvatarRemove() {
    if (avatarBusy) return;
    setAvatarBusy(true);
    const supabase = createClient();

    const { data: files } = await supabase.storage.from("avatars").list(userId);
    if (files && files.length > 0) {
      const paths = files.map((f) => `${userId}/${f.name}`);
      const { error: removeError } = await supabase.storage.from("avatars").remove(paths);
      if (removeError) {
        toast.error("Couldn't remove old files", { description: removeError.message });
        setAvatarBusy(false);
        return;
      }
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", userId);

    if (updateError) {
      toast.error("Couldn't clear profile", { description: updateError.message });
      setAvatarBusy(false);
      return;
    }

    setAvatarUrl(null);
    toast.success("Profile picture removed");
    router.refresh();
    setAvatarBusy(false);
  }

  async function handleNameSave() {
    setNameSaving(true);
    const result = await updateProfileName({
      firstName: firstNameInput,
      lastName: lastNameInput,
    });
    setNameSaving(false);

    if (!result.ok) {
      toast.error("Couldn't save", { description: result.error });
      return;
    }
    toast.success("Saved");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Your picture and how your name appears in quotes, invoices, and team activity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* Left: avatar + upload */}
          <div className="flex flex-col items-center gap-3 sm:items-start">
            <Avatar className="size-20">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="Profile picture" /> : null}
              <AvatarFallback className="bg-muted text-base font-medium text-muted-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePick}
                disabled={avatarBusy}
                className="gap-1.5"
              >
                {avatarBusy ? (
                  <Ring size="sm" className="text-current" />
                ) : (
                  <>
                    <Upload className="size-3.5" />
                    {avatarUrl ? "Change" : "Upload"}
                  </>
                )}
              </Button>
              {avatarUrl ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleAvatarRemove}
                  disabled={avatarBusy}
                  className="gap-1.5 text-muted-foreground"
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {avatarBusy ? "Working…" : "PNG, JPG, or WebP — up to 2 MB."}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Right: name fields */}
          <div className="flex flex-1 flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first-name">First name</Label>
                <Input
                  id="first-name"
                  value={firstNameInput}
                  onChange={(e) => setFirstNameInput(e.target.value)}
                  placeholder="Jane"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Last name</Label>
                <Input
                  id="last-name"
                  value={lastNameInput}
                  onChange={(e) => setLastNameInput(e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleNameSave} disabled={nameSaving}>
                {nameSaving ? <Ring size="sm" className="text-current" /> : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
