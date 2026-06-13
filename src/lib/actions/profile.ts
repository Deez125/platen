"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type UpdateProfileNameInput = {
  firstName: string;
  lastName: string;
};

export type UpdateProfileNameResult = { ok: true } | { ok: false; error: string };

export async function updateProfileName(
  input: UpdateProfileNameInput,
): Promise<UpdateProfileNameResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: input.firstName.trim() || null,
      last_name: input.lastName.trim() || null,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  // Layout reads first/last name; bust caches so sidebar updates.
  revalidatePath("/", "layout");
  return { ok: true };
}
