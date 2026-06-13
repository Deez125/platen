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
};

export function ProductCard({
  id,
  name,
  imageUrl,
  isActive,
  categoryName,
  startingPrice,
  custom = false,
}: Props) {
  return (
    <Link href={`/catalog/products/${id}`} className="group block">
      <Card className="h-full overflow-hidden border-transparent bg-sidebar p-0 transition-colors hover:bg-sidebar-accent/50">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-muted/40">
          {custom ? (
            <Badge variant="info" className="absolute top-2 left-2 text-[10px]">
              Custom
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
            <span className="truncate text-sm font-medium">{name}</span>
            {!isActive ? (
              <Badge variant="neutral" className="shrink-0 text-[10px]">
                Inactive
              </Badge>
            ) : null}
          </div>
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
