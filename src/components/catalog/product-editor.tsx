"use client";

import { Plus, Shirt, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ring } from "@/components/ui/ring";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { savePricingTiers, updateTenantProduct } from "@/lib/actions/catalog";

const NONE = "__none__";

type Category = { id: string; name: string };

type TierField = {
  id?: string;
  minQuantity: string;
  maxQuantity: string;
  unitPrice: string;
  cost: string;
};

type InitialTier = {
  id: string;
  minQuantity: number;
  maxQuantity: number | null;
  // numeric columns arrive from PostgREST as numbers; coerced to strings below.
  unitPrice: string | number;
  cost: string | number | null;
};

type Props = {
  productId: string;
  imageUrl: string | null;
  categories: Category[];
  initial: {
    name: string;
    categoryId: string | null;
    description: string;
    minQuantity: number | null;
    isActive: boolean;
  };
  initialTiers: InitialTier[];
};

export function ProductEditor({ productId, imageUrl, categories, initial, initialTiers }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? NONE);
  const [description, setDescription] = useState(initial.description);
  const [minQuantity, setMinQuantity] = useState(
    initial.minQuantity === null ? "" : String(initial.minQuantity),
  );
  const [isActive, setIsActive] = useState(initial.isActive);
  const [tiers, setTiers] = useState<TierField[]>(
    initialTiers.length > 0
      ? initialTiers.map((t) => ({
          id: t.id,
          minQuantity: String(t.minQuantity),
          maxQuantity: t.maxQuantity === null ? "" : String(t.maxQuantity),
          unitPrice: String(t.unitPrice),
          cost: t.cost === null || t.cost === undefined ? "" : String(t.cost),
        }))
      : [{ minQuantity: "1", maxQuantity: "", unitPrice: "", cost: "" }],
  );
  const [saving, setSaving] = useState(false);

  function updateTier(index: number, patch: Partial<TierField>) {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }
  function addTier() {
    setTiers((prev) => [...prev, { minQuantity: "", maxQuantity: "", unitPrice: "", cost: "" }]);
  }
  function removeTier(index: number) {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (tiers.length === 0) {
      toast.error("Add at least one pricing tier");
      return;
    }
    for (const t of tiers) {
      if (!t.minQuantity.trim() || Number.isNaN(Number(t.minQuantity))) {
        toast.error("Each tier needs a valid min quantity");
        return;
      }
      if (!t.unitPrice.trim() || Number.isNaN(Number(t.unitPrice))) {
        toast.error("Each tier needs a valid unit price");
        return;
      }
    }

    setSaving(true);
    const detailsResult = await updateTenantProduct(productId, {
      name: name.trim(),
      categoryId: categoryId === NONE ? null : categoryId,
      description: description.trim() === "" ? null : description.trim(),
      minQuantity: minQuantity.trim() === "" ? null : Number(minQuantity),
      isActive,
    });
    if (!detailsResult.ok) {
      setSaving(false);
      toast.error("Couldn't save details", { description: detailsResult.error });
      return;
    }

    const pricingResult = await savePricingTiers(
      productId,
      tiers.map((t) => ({
        minQuantity: Number(t.minQuantity),
        maxQuantity: t.maxQuantity.trim() === "" ? null : Number(t.maxQuantity),
        unitPrice: Number(t.unitPrice),
        cost: t.cost.trim() === "" ? null : Number(t.cost),
      })),
    );
    setSaving(false);
    if (!pricingResult.ok) {
      toast.error("Saved details, but pricing failed", { description: pricingResult.error });
      return;
    }

    toast.success("Saved");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>How this product shows up in the catalog and on quotes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/40">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className="size-full object-cover" />
              ) : (
                <Shirt className="size-8 text-muted-foreground/50" />
              )}
            </div>
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prod-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="prod-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Heavy Cotton T-Shirt"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-category">Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="prod-category">
                    <SelectValue placeholder="Uncategorized" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Uncategorized</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prod-description">Description</Label>
            <Textarea
              id="prod-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional notes shown on quotes."
            />
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div className="space-y-2">
              <Label htmlFor="prod-minqty">Minimum quantity</Label>
              <Input
                id="prod-minqty"
                inputMode="numeric"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                placeholder="24"
                className="w-28"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                id="prod-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 cursor-pointer"
              />
              <Label htmlFor="prod-active" className="cursor-pointer">
                Active (available when building quotes)
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
          <CardDescription>
            Quantity-break tiers. Leave the top tier's max blank for “and up”.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-center gap-2 text-xs font-medium text-muted-foreground">
            <span>Min qty</span>
            <span>Max qty</span>
            <span>Unit price</span>
            <span>Blank cost</span>
            <span className="w-8" />
          </div>
          {tiers.map((tier, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: tiers are positional, no stable id for new rows
              key={i}
              className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-center gap-2"
            >
              <Input
                inputMode="numeric"
                value={tier.minQuantity}
                onChange={(e) => updateTier(i, { minQuantity: e.target.value })}
                placeholder="1"
              />
              <Input
                inputMode="numeric"
                value={tier.maxQuantity}
                onChange={(e) => updateTier(i, { maxQuantity: e.target.value })}
                placeholder="∞"
              />
              <Input
                inputMode="decimal"
                value={tier.unitPrice}
                onChange={(e) => updateTier(i, { unitPrice: e.target.value })}
                placeholder="0.00"
              />
              <Input
                inputMode="decimal"
                value={tier.cost}
                onChange={(e) => updateTier(i, { cost: e.target.value })}
                placeholder="0.00"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeTier(i)}
                disabled={tiers.length === 1}
                aria-label="Remove tier"
                className="text-muted-foreground"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addTier} className="gap-1.5">
            <Plus className="size-4" /> Add tier
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => router.push("/catalog")} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Ring size="sm" className="text-current" /> : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
