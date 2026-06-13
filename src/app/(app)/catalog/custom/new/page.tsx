import { redirect } from "next/navigation";

import { CustomProductBuilder } from "@/components/catalog/custom-product-builder";
import { getActiveOrgId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function NewCustomProductPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  const supabase = await createClient();
  const { data: cats } = await supabase
    .from("product_categories")
    .select("id, name")
    .eq("tenant_id", orgId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return (
    <CustomProductBuilder
      orgId={orgId}
      categories={(cats ?? []) as { id: string; name: string }[]}
    />
  );
}
