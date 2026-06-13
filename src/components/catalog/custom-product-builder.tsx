"use client";

import {
  ArrowLeft,
  Check,
  GripVertical,
  ImagePlus,
  Layers,
  Palette,
  Plus,
  Ruler,
  Sparkles,
  Tag,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { MoneyInput } from "@/components/forms/money-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ring } from "@/components/ui/ring";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createCategory,
  createCustomProduct,
  deleteTenantProduct,
  updateCustomProduct,
} from "@/lib/actions/catalog";
import {
  type CustomBlocks as Blocks,
  type CustomProductConfig,
  type CustomMethod as Method,
  type OptionChoice,
  emptyBlocks,
} from "@/lib/catalog/custom-product";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string };

type BuilderInitial = {
  name: string;
  categoryId: string | null;
  description: string;
  minQuantity: number | null;
  isActive: boolean;
  imageUrl: string | null;
  config: CustomProductConfig;
};

const CHOICE_ROW = "grid grid-cols-[1fr_8rem_auto] items-center gap-2";
const MAX_IMG_BYTES = 2 * 1024 * 1024; // 2 MB
const IMG_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

const METHOD_TEMPLATES: Record<string, string[]> = {
  "Screen Print": ["Burn screen", "Mix ink", "Print", "Cure"],
  "DTF Transfer": ["Print transfer", "Powder & cure", "Heat press"],
  HTV: ["Cut vinyl", "Weed", "Heat press"],
  Embroidery: ["Digitize file", "Hoop", "Run machine", "Trim"],
  "Laser Engrave": ["Set up file", "Run laser", "Clean"],
  "Heat Press": ["Position", "Press", "Peel"],
  "Sew-on Patch": ["Position patch", "Sew"],
};

type Template = {
  name: string;
  category: string;
  unitLabel: string;
  basePrice: string;
  blocks: Partial<Blocks>;
  methods: string[];
};

const PRODUCT_TEMPLATES: Record<string, Template> = {
  koozie: {
    name: "Koozie",
    category: "Drinkware",
    unitLabel: "",
    basePrice: "1.50",
    blocks: {
      quantity: {
        on: true,
        rows: [
          { min: "1", max: "49", price: "5.00" },
          { min: "50", max: "", price: "4.00" },
        ],
      },
      options: {
        on: true,
        groups: [
          {
            name: "Material",
            choices: [
              { label: "Foam", delta: "0" },
              { label: "Neoprene", delta: "1.00" },
            ],
          },
        ],
      },
    },
    methods: ["Screen Print", "DTF Transfer"],
  },
  patchHat: {
    name: "Leather Patch Hat",
    category: "Headwear",
    unitLabel: "",
    basePrice: "8.00",
    blocks: {
      options: {
        on: true,
        groups: [
          {
            name: "Hat color",
            choices: [
              { label: "Black", delta: "0" },
              { label: "Khaki", delta: "0" },
            ],
          },
          {
            name: "Patch size",
            choices: [
              { label: '2" × 3" rectangle', delta: "0" },
              { label: '2.5" × 3.5" rectangle', delta: "0.50" },
              { label: '2.5" round', delta: "0.50" },
            ],
          },
          {
            name: "Patch color",
            choices: [
              { label: "Black leather", delta: "0" },
              { label: "Brown leather", delta: "0" },
              { label: "Tan leather", delta: "0" },
            ],
          },
        ],
      },
    },
    methods: ["Heat Press", "Sew-on Patch"],
  },
  sign: {
    name: "Yard Sign",
    category: "Signs",
    unitLabel: "per sign",
    basePrice: "0",
    blocks: {
      dimension: { on: true, unit: "sqft", price: "6.00", min: "12.00" },
      options: {
        on: true,
        groups: [
          {
            name: "Sides",
            choices: [
              { label: "Single", delta: "0" },
              { label: "Double", delta: "1.50" },
            ],
          },
        ],
      },
      fees: { on: true, rows: [{ label: "Setup", amount: "15.00", perUnit: false }] },
    },
    methods: ["Print + Cut"],
  },
};

export function CustomProductBuilder({
  orgId,
  categories: initialCategories,
  productId,
  initial,
}: {
  orgId: string;
  categories: Category[];
  productId?: string;
  initial?: BuilderInitial;
}) {
  const router = useRouter();
  const idRef = useRef(1);
  const nextId = () => String(idRef.current++);

  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl ?? null);
  const [imgBusy, setImgBusy] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const imgPathRef = useRef<string | null>(null);
  const [name, setName] = useState(initial?.name ?? "");
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [categoryId, setCategoryId] = useState<string>(initial?.categoryId ?? "");
  const [addingCat, setAddingCat] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [catBusy, setCatBusy] = useState(false);
  // Empty unit label reads as "per unit" by default.
  const [unitLabel, setUnitLabel] = useState(initial?.config.unitLabel ?? "");
  const [minQty, setMinQty] = useState(
    initial?.minQuantity != null ? String(initial.minQuantity) : "",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [basePrice, setBasePrice] = useState(initial?.config.basePrice ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [blocks, setBlocks] = useState<Blocks>(() => initial?.config.blocks ?? emptyBlocks());
  const [methods, setMethods] = useState<Method[]>(initial?.config.methods ?? []);

  function setBlock<K extends keyof Blocks>(key: K, patch: Partial<Blocks[K]>) {
    setBlocks((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }
  function toggleBlock(key: keyof Blocks) {
    setBlocks((prev) => ({ ...prev, [key]: { ...prev[key], on: !prev[key].on } }));
  }

  async function addCategory() {
    const c = newCat.trim();
    if (!c) return;
    setCatBusy(true);
    const result = await createCategory(c);
    setCatBusy(false);
    if (!result.ok) {
      toast.error("Couldn't add category", { description: result.error });
      return;
    }
    setCategories((p) => [...p, { id: result.id, name: result.name }]);
    setCategoryId(result.id);
    setNewCat("");
    setAddingCat(false);
  }

  function addMethod(name: string, steps: string[]) {
    setMethods((p) => [...p, { id: nextId(), name, steps: [...steps] }]);
  }
  function removeMethod(id: string) {
    setMethods((p) => p.filter((m) => m.id !== id));
  }
  function updateMethod(id: string, patch: Partial<Method>) {
    setMethods((p) => p.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function applyTemplate(key: keyof typeof PRODUCT_TEMPLATES) {
    const t = PRODUCT_TEMPLATES[key];
    if (!t) return;
    setName(t.name);
    // Match the template's category name to an existing one (don't auto-create).
    const match = categories.find((c) => c.name.toLowerCase() === t.category.toLowerCase());
    setCategoryId(match?.id ?? "");
    setUnitLabel(t.unitLabel);
    setBasePrice(t.basePrice);
    setBlocks({ ...emptyBlocks(), ...t.blocks } as Blocks);
    setMethods(t.methods.map((m) => ({ id: nextId(), name: m, steps: METHOD_TEMPLATES[m] ?? [] })));
    toast.success(`Loaded the ${t.name} template`);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Give the product a name");
      return;
    }
    setSaving(true);
    const config: CustomProductConfig = { unitLabel, basePrice, blocks, methods };
    const mq = Number.parseInt(minQty, 10);
    const input = {
      name: name.trim(),
      categoryId: categoryId || null,
      description: description.trim() || null,
      minQuantity: Number.isFinite(mq) && mq > 0 ? mq : null,
      imageUrl,
      isActive,
      config,
    };
    const result = productId
      ? await updateCustomProduct(productId, input)
      : await createCustomProduct(input);
    setSaving(false);
    if (!result.ok) {
      toast.error("Couldn't save", { description: result.error });
      return;
    }
    toast.success(productId ? "Product updated" : "Product created");
    router.push("/catalog");
    router.refresh();
  }

  async function handleDelete() {
    if (!productId) return;
    const result = await deleteTenantProduct(productId);
    if (!result.ok) {
      toast.error("Couldn't delete", { description: result.error });
      return;
    }
    toast.success("Product deleted");
    router.push("/catalog");
    router.refresh();
  }

  // Real Storage upload (same logic as logo upload), to the product-images
  // bucket. The product row isn't saved yet — only the image is uploaded.
  function pickImage() {
    if (!imgBusy) imgInputRef.current?.click();
  }

  async function onImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!IMG_TYPES.includes(file.type)) {
      toast.error("Not an image", { description: "Use PNG, JPG, WebP, or SVG." });
      return;
    }
    if (file.size > MAX_IMG_BYTES) {
      toast.error("File too large", { description: "Images must be under 2 MB." });
      return;
    }

    setImgBusy(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${orgId}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      toast.error("Upload failed", { description: error.message });
      setImgBusy(false);
      return;
    }

    // Clean up the previously uploaded file when replacing.
    if (imgPathRef.current) {
      await supabase.storage.from("product-images").remove([imgPathRef.current]);
    }
    imgPathRef.current = path;

    const {
      data: { publicUrl },
    } = supabase.storage.from("product-images").getPublicUrl(path);
    setImageUrl(`${publicUrl}?v=${Date.now()}`);
    setImgBusy(false);
  }

  async function removeImage() {
    if (imgBusy) return;
    if (imgPathRef.current) {
      const supabase = createClient();
      await supabase.storage.from("product-images").remove([imgPathRef.current]);
      imgPathRef.current = null;
    }
    setImageUrl(null);
  }

  const categoryName = categories.find((c) => c.id === categoryId)?.name ?? "";

  const enabledBlocks = (
    [
      ["quantity", "Quantity breaks"],
      ["size", "By size"],
      ["color", "By color count"],
      ["dimension", "By size / area"],
      ["options", "Options"],
      ["fees", "Add-on fees"],
    ] as const
  ).filter(([k]) => blocks[k].on);

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/catalog")}
          className="gap-1.5 text-muted-foreground"
        >
          <ArrowLeft className="size-4" /> Catalog
        </Button>
      </div>

      <div className="flex flex-col gap-2 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {productId ? "Edit custom product" : "New custom product"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Build any product from pricing blocks and production methods — nothing is hardcoded.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {productId ? (
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                  <Trash2 className="size-4" /> Delete
                </Button>
              }
              title={`Delete ${name || "this product"}?`}
              description="This removes the product from your catalog."
              confirmLabel="Delete"
              variant="destructive"
              onConfirm={handleDelete}
            />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Sparkles className="size-4" /> Start from template
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Templates</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => applyTemplate("koozie")}>Koozie</DropdownMenuItem>
                <DropdownMenuItem onClick={() => applyTemplate("patchHat")}>
                  Leather patch hat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => applyTemplate("sign")}>Yard sign</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Ring size="sm" className="text-current" /> : "Save product"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>
                How this product shows up in the catalog and on quotes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={pickImage}
                    disabled={imgBusy}
                    className={cn(
                      "flex size-24 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-md border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted disabled:cursor-default",
                      imageUrl ? "border-border" : "border-dashed border-border",
                    )}
                  >
                    {imgBusy ? (
                      <Ring size="sm" className="text-current" />
                    ) : imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <>
                        <ImagePlus className="size-6" />
                        <span className="text-[10px]">Add image</span>
                      </>
                    )}
                  </button>
                  {imageUrl && !imgBusy ? (
                    <button
                      type="button"
                      onClick={removeImage}
                      aria-label="Remove image"
                      className="absolute -top-2 -right-2 cursor-pointer rounded-full border border-border bg-background p-1 text-muted-foreground shadow-sm transition-colors hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  ) : null}
                  <input
                    ref={imgInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={onImageChange}
                  />
                </div>
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cp-name">
                      Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="cp-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Leather Patch Hat"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="cp-category">Category</Label>
                      {addingCat ? (
                        <div className="flex gap-1.5">
                          <Input
                            autoFocus
                            value={newCat}
                            onChange={(e) => setNewCat(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addCategory()}
                            placeholder="New category"
                          />
                          <Button
                            size="icon-sm"
                            variant="outline"
                            onClick={addCategory}
                            disabled={catBusy}
                            aria-label="Add"
                          >
                            <Check className="size-4" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => setAddingCat(false)}
                            aria-label="Cancel"
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      ) : (
                        <Select
                          value={categoryId}
                          onValueChange={(v) =>
                            v === "__add__" ? setAddingCat(true) : setCategoryId(v)
                          }
                        >
                          <SelectTrigger id="cp-category">
                            <SelectValue placeholder="Uncategorized" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                            {categories.length > 0 ? <SelectSeparator /> : null}
                            <SelectItem value="__add__">+ New category…</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cp-unit">Priced per</Label>
                      <Input
                        id="cp-unit"
                        value={unitLabel}
                        onChange={(e) => setUnitLabel(e.target.value)}
                        placeholder="each / sign / sq ft"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="cp-base">Base price (per {unitLabel || "unit"})</Label>
                      <MoneyInput
                        id="cp-base"
                        value={basePrice}
                        onChange={(e) => setBasePrice(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cp-minqty">Minimum quantity</Label>
                      <Input
                        id="cp-minqty"
                        inputMode="numeric"
                        value={minQty}
                        onChange={(e) => setMinQty(e.target.value)}
                        placeholder="No minimum"
                      />
                    </div>
                  </div>
                  <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="size-4"
                    />
                    Active (available when building quotes)
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cp-desc">Description</Label>
                <Textarea
                  id="cp-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Optional notes shown on quotes."
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing blocks */}
          <Card>
            <CardHeader>
              <CardTitle>How is it priced?</CardTitle>
              <CardDescription>
                Turn on only the dimensions that apply. Everything off = a flat base price.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <BlockRow
                icon={<Layers className="size-4" />}
                title="Quantity breaks"
                desc="Per-unit price changes with how many they order."
                on={blocks.quantity.on}
                onToggle={() => toggleBlock("quantity")}
              >
                <RowTable
                  cols={["Min qty", "Max qty", "Price"]}
                  rows={blocks.quantity.rows}
                  onAdd={() =>
                    setBlock("quantity", {
                      rows: [...blocks.quantity.rows, { min: "", max: "", price: "" }],
                    })
                  }
                  onRemove={(i) =>
                    setBlock("quantity", { rows: blocks.quantity.rows.filter((_, x) => x !== i) })
                  }
                  render={(row, i) => (
                    <>
                      <Input
                        value={row.min}
                        onChange={(e) => patchRow("quantity", i, { min: e.target.value })}
                        placeholder="1"
                        inputMode="numeric"
                      />
                      <Input
                        value={row.max}
                        onChange={(e) => patchRow("quantity", i, { max: e.target.value })}
                        placeholder="∞"
                        inputMode="numeric"
                      />
                      <MoneyInput
                        value={row.price}
                        onChange={(e) => patchRow("quantity", i, { price: e.target.value })}
                      />
                    </>
                  )}
                />
              </BlockRow>

              <BlockRow
                icon={<Tag className="size-4" />}
                title="By size"
                desc="Different price/upcharge per size (S, M, L, 2XL…)."
                on={blocks.size.on}
                onToggle={() => toggleBlock("size")}
              >
                <RowTable
                  cols={["Size", "Upcharge"]}
                  rows={blocks.size.rows}
                  onAdd={() =>
                    setBlock("size", { rows: [...blocks.size.rows, { label: "", upcharge: "0" }] })
                  }
                  onRemove={(i) =>
                    setBlock("size", { rows: blocks.size.rows.filter((_, x) => x !== i) })
                  }
                  render={(row, i) => (
                    <>
                      <Input
                        value={row.label}
                        onChange={(e) => patchRow("size", i, { label: e.target.value })}
                        placeholder="2XL"
                      />
                      <MoneyInput
                        value={row.upcharge}
                        onChange={(e) => patchRow("size", i, { upcharge: e.target.value })}
                      />
                    </>
                  )}
                />
              </BlockRow>

              <BlockRow
                icon={<Palette className="size-4" />}
                title="By color count"
                desc="Price by number of ink / thread colors."
                on={blocks.color.on}
                onToggle={() => toggleBlock("color")}
              >
                <RowTable
                  cols={["# colors", "Add per unit"]}
                  rows={blocks.color.rows}
                  onAdd={() =>
                    setBlock("color", { rows: [...blocks.color.rows, { colors: "", price: "" }] })
                  }
                  onRemove={(i) =>
                    setBlock("color", { rows: blocks.color.rows.filter((_, x) => x !== i) })
                  }
                  render={(row, i) => (
                    <>
                      <Input
                        value={row.colors}
                        onChange={(e) => patchRow("color", i, { colors: e.target.value })}
                        placeholder="1"
                        inputMode="numeric"
                      />
                      <MoneyInput
                        value={row.price}
                        onChange={(e) => patchRow("color", i, { price: e.target.value })}
                      />
                    </>
                  )}
                />
              </BlockRow>

              <BlockRow
                icon={<Ruler className="size-4" />}
                title="By size / area"
                desc="Price by measured area or length (signs, engraving)."
                on={blocks.dimension.on}
                onToggle={() => toggleBlock("dimension")}
              >
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Unit</Label>
                    <Select
                      value={blocks.dimension.unit}
                      onValueChange={(v) => setBlock("dimension", { unit: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sqin">sq in</SelectItem>
                        <SelectItem value="sqft">sq ft</SelectItem>
                        <SelectItem value="linft">linear ft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Price / unit</Label>
                    <MoneyInput
                      value={blocks.dimension.price}
                      onChange={(e) => setBlock("dimension", { price: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Minimum</Label>
                    <MoneyInput
                      value={blocks.dimension.min}
                      onChange={(e) => setBlock("dimension", { min: e.target.value })}
                    />
                  </div>
                </div>
              </BlockRow>

              <BlockRow
                icon={<Layers className="size-4" />}
                title="Options"
                desc="Choosable groups — material, sides, finish… each ± a price."
                on={blocks.options.on}
                onToggle={() => toggleBlock("options")}
              >
                <div className="space-y-3">
                  {blocks.options.groups.map((group, gi) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: positional mock rows
                    <div key={gi} className="rounded-md border border-border p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Input
                          value={group.name}
                          onChange={(e) =>
                            setBlock("options", {
                              groups: blocks.options.groups.map((g, x) =>
                                x === gi ? { ...g, name: e.target.value } : g,
                              ),
                            })
                          }
                          placeholder="Option group (e.g. Material)"
                          className="h-8"
                        />
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Remove group"
                          className="text-muted-foreground"
                          onClick={() =>
                            setBlock("options", {
                              groups: blocks.options.groups.filter((_, x) => x !== gi),
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <div className="space-y-1.5">
                        {group.choices.map((choice, ci) => (
                          // biome-ignore lint/suspicious/noArrayIndexKey: positional mock rows
                          <div key={ci} className={CHOICE_ROW}>
                            <Input
                              value={choice.label}
                              onChange={(e) =>
                                updateChoice(setBlocks, gi, ci, { label: e.target.value })
                              }
                              placeholder="Choice (e.g. Neoprene)"
                              className="h-8"
                            />
                            <MoneyInput
                              value={choice.delta}
                              onChange={(e) =>
                                updateChoice(setBlocks, gi, ci, { delta: e.target.value })
                              }
                            />
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label="Remove choice"
                              className="text-muted-foreground"
                              onClick={() =>
                                setBlocks((prev) => ({
                                  ...prev,
                                  options: {
                                    ...prev.options,
                                    groups: prev.options.groups.map((g, x) =>
                                      x === gi
                                        ? { ...g, choices: g.choices.filter((_, y) => y !== ci) }
                                        : g,
                                    ),
                                  },
                                }))
                              }
                            >
                              <X className="size-3.5" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-muted-foreground"
                          onClick={() =>
                            setBlocks((prev) => ({
                              ...prev,
                              options: {
                                ...prev.options,
                                groups: prev.options.groups.map((g, x) =>
                                  x === gi
                                    ? { ...g, choices: [...g.choices, { label: "", delta: "" }] }
                                    : g,
                                ),
                              },
                            }))
                          }
                        >
                          <Plus className="size-3.5" /> Add choice
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() =>
                      setBlock("options", {
                        groups: [
                          ...blocks.options.groups,
                          { name: "", choices: [{ label: "", delta: "" }] },
                        ],
                      })
                    }
                  >
                    <Plus className="size-4" /> Add option group
                  </Button>
                </div>
              </BlockRow>

              <BlockRow
                icon={<Wrench className="size-4" />}
                title="Add-on fees"
                desc="One-offs like screen setup or digitizing."
                on={blocks.fees.on}
                onToggle={() => toggleBlock("fees")}
              >
                <RowTable
                  cols={["Fee", "Amount", "Per unit?"]}
                  rows={blocks.fees.rows}
                  onAdd={() =>
                    setBlock("fees", {
                      rows: [...blocks.fees.rows, { label: "", amount: "", perUnit: false }],
                    })
                  }
                  onRemove={(i) =>
                    setBlock("fees", { rows: blocks.fees.rows.filter((_, x) => x !== i) })
                  }
                  render={(row, i) => (
                    <>
                      <Input
                        value={row.label}
                        onChange={(e) => patchRow("fees", i, { label: e.target.value })}
                        placeholder="Screen setup"
                      />
                      <MoneyInput
                        value={row.amount}
                        onChange={(e) => patchRow("fees", i, { amount: e.target.value })}
                      />
                      <label className="flex h-9 items-center justify-center">
                        <input
                          type="checkbox"
                          checked={row.perUnit}
                          onChange={(e) => patchRow("fees", i, { perUnit: e.target.checked })}
                          className="size-4"
                        />
                      </label>
                    </>
                  )}
                />
              </BlockRow>
            </CardContent>
          </Card>

          {/* Methods */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>How is it made?</CardTitle>
                  <CardDescription>
                    Each method becomes a production work unit with its own checklist.
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Plus className="size-4" /> Add method
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>From template</DropdownMenuLabel>
                    {Object.entries(METHOD_TEMPLATES).map(([m, steps]) => (
                      <DropdownMenuItem key={m} onClick={() => addMethod(m, steps)}>
                        {m}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => addMethod("New method", [])}>
                      Custom (blank)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              {methods.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                  No methods yet. Add one (e.g. Screen Print, DTF, Engrave) — a product can support
                  several.
                </p>
              ) : (
                <div className="space-y-3">
                  {methods.map((m) => (
                    <MethodCard
                      key={m.id}
                      method={m}
                      onChange={(patch) => updateMethod(m.id, patch)}
                      onRemove={() => removeMethod(m.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>How this product is shaping up.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center overflow-hidden rounded-md bg-muted/40 text-muted-foreground">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <ImagePlus className="size-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{name || "Untitled product"}</p>
                  <p className="text-xs text-muted-foreground">
                    {categoryName || "Uncategorized"} · per {unitLabel || "unit"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground">Base price</p>
                <p className="text-lg font-semibold tabular-nums">
                  {basePrice ? `$${basePrice}` : "—"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Pricing dimensions</p>
                {enabledBlocks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Flat price only</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {enabledBlocks.map(([k, label]) => (
                      <Badge key={k} variant="neutral" className="text-[10px]">
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Methods</p>
                {methods.length === 0 ? (
                  <p className="text-xs text-muted-foreground">None yet</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {methods.map((m) => (
                      <Badge key={m.id} variant="info" className="text-[10px]">
                        {m.name || "Method"}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  // Row patch helpers (closures over setBlocks for the array-of-rows blocks).
  function patchRow<K extends "quantity" | "size" | "color" | "fees">(
    key: K,
    index: number,
    patch: Partial<Blocks[K]["rows"][number]>,
  ) {
    setBlocks((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        rows: prev[key].rows.map((r, i) => (i === index ? { ...r, ...patch } : r)),
      },
    }));
  }
}

/* ----- small building-block UI helpers ----- */

function BlockRow({
  icon,
  title,
  desc,
  on,
  onToggle,
  children,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border", on ? "border-border" : "border-transparent")}>
      <label
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
          on ? "bg-muted/40" : "hover:bg-muted/40",
        )}
      >
        <input type="checkbox" checked={on} onChange={onToggle} className="size-4" />
        <span className="text-muted-foreground">{icon}</span>
        <span className="flex-1">
          <span className="block text-sm font-medium">{title}</span>
          <span className="block text-xs text-muted-foreground">{desc}</span>
        </span>
      </label>
      {on ? <div className="border-border border-t px-3 py-3">{children}</div> : null}
    </div>
  );
}

function RowTable<T>({
  cols,
  rows,
  render,
  onAdd,
  onRemove,
}: {
  cols: string[];
  rows: T[];
  render: (row: T, index: number) => ReactNode;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  // Literal classes so Tailwind picks them up (no dynamic class strings).
  const template = cols.length === 3 ? "grid-cols-[1fr_1fr_1fr_auto]" : "grid-cols-[1fr_1fr_auto]";
  return (
    <div className="space-y-2">
      <div
        className={cn(
          "grid items-center gap-2 text-xs font-medium text-muted-foreground",
          template,
        )}
      >
        {cols.map((c) => (
          <span key={c}>{c}</span>
        ))}
        <span className="w-8" />
      </div>
      {rows.map((row, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: positional mock rows
        <div key={i} className={cn("grid items-center gap-2", template)}>
          {render(row, i)}
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Remove row"
            className="text-muted-foreground"
            onClick={() => onRemove(i)}
            disabled={rows.length === 1}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="outline" className="gap-1.5" onClick={onAdd}>
        <Plus className="size-4" /> Add row
      </Button>
    </div>
  );
}

function MethodCard({
  method,
  onChange,
  onRemove,
}: {
  method: Method;
  onChange: (patch: Partial<Method>) => void;
  onRemove: () => void;
}) {
  function setStep(i: number, value: string) {
    onChange({ steps: method.steps.map((s, x) => (x === i ? value : s)) });
  }
  function addStep() {
    onChange({ steps: [...method.steps, ""] });
  }
  function removeStep(i: number) {
    onChange({ steps: method.steps.filter((_, x) => x !== i) });
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-3 flex items-center gap-2">
        <Input
          value={method.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Method name"
          className="h-8 font-medium"
        />
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Remove method"
          className="text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">Production steps</p>
      <div className="space-y-1.5">
        {method.steps.map((step, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: positional mock steps
          <div key={i} className="flex items-center gap-2">
            <GripVertical className="size-3.5 shrink-0 text-muted-foreground/40" />
            <Input
              value={step}
              onChange={(e) => setStep(i, e.target.value)}
              placeholder={`Step ${i + 1}`}
              className="h-8"
            />
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Remove step"
              className="text-muted-foreground"
              onClick={() => removeStep(i)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ))}
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 text-muted-foreground"
          onClick={addStep}
        >
          <Plus className="size-3.5" /> Add step
        </Button>
      </div>
    </div>
  );
}

/* Updates a single option choice without threading too many handlers around. */
function updateChoice(
  setBlocks: Dispatch<SetStateAction<Blocks>>,
  groupIndex: number,
  choiceIndex: number,
  patch: Partial<OptionChoice>,
) {
  setBlocks((prev) => ({
    ...prev,
    options: {
      ...prev.options,
      groups: prev.options.groups.map((g, x) =>
        x === groupIndex
          ? { ...g, choices: g.choices.map((c, y) => (y === choiceIndex ? { ...c, ...patch } : c)) }
          : g,
      ),
    },
  }));
}
