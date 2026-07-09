import { Package, Shirt } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

type Props = {
  id: string;
  name: string;
  imageUrl: string | null;
  isActive: boolean;
  categoryName: string | null;
  startingPrice: number | null;
  custom?: boolean;
  /** Where the product came from — distributor name, or "Custom". Shown on the card. */
  source?: string | null;
  /** Manufacturer brand + style/model number (distributor products). */
  brand?: string | null;
  styleNumber?: string | null;
};

export function ProductCard({
  id,
  name,
  imageUrl,
  isActive,
  categoryName,
  startingPrice,
  custom = false,
  source = null,
  brand = null,
  styleNumber = null,
}: Props) {
  const modelLine = [brand, styleNumber].filter(Boolean).join(" · ");
  return (
    <Link href={`/catalog/products/${id}`} className="group block">
      <Card className="h-full overflow-hidden border-transparent bg-sidebar p-0 transition-colors hover:bg-sidebar-accent/50">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-muted/40">
          {custom ? (
            <Badge variant="info" className="absolute top-2 left-2 text-[10px]">
              Custom
            </Badge>
          ) : source ? (
            <Badge variant="secondary" className="absolute top-2 left-2 text-[10px]">
              {source}
            </Badge>
          ) : null}
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="size-full object-cover" />
          ) : custom ? (
            <Package className="size-10 text-muted-foreground/50" />
          ) : (
            <Shirt className="size-10 text-muted-foreground/50" />
          )}
        </div>
        <div className="space-y-1 p-3">
          <div className="flex items-start justify-between gap-2">
            <span className="truncate text-sm font-medium">{modelLine || name}</span>
            {!isActive ? (
              <Badge variant="neutral" className="shrink-0 text-[10px]">
                Inactive
              </Badge>
            ) : null}
          </div>
          {modelLine ? (
            <div className="truncate text-xs text-muted-foreground">{name}</div>
          ) : null}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate">{categoryName ?? "Uncategorized"}</span>
            {startingPrice !== null ? (
              <span className="shrink-0 font-medium text-foreground">
                {formatCurrency(startingPrice)}
              </span>
            ) : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}
