import Link from "next/link";

import type { CustomerSummary } from "@/components/customers/customer-card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { customerInitials } from "@/lib/customers";
import { cn } from "@/lib/utils";

/**
 * Customer list (table). Default: each row links to the detail page. With
 * `onSelect`: the row calls it instead — identical look either way. Used by the
 * customers page and the quote builder's picker dialog.
 */
export function CustomerListView({
  customers,
  onSelect,
}: {
  customers: CustomerSummary[];
  onSelect?: (id: string) => void;
}) {
  return (
    <Table className="border-separate border-spacing-x-0 border-spacing-y-1">
      <TableHeader className="[&_tr]:border-0 [&_th]:border-b">
        <TableRow className="hover:bg-transparent">
          <TableHead>Name</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Location</TableHead>
          <TableHead className="text-right">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((c) => {
          const location = [c.city, c.state].filter(Boolean).join(", ");
          const initials = customerInitials(c.name, c.company);
          const href = onSelect ? undefined : `/customers/${c.id}`;
          return (
            <TableRow
              key={c.id}
              onClick={onSelect ? () => onSelect(c.id) : undefined}
              className="group cursor-pointer border-0 hover:bg-transparent"
            >
              <TableCell className="rounded-l-md py-1.5 font-medium transition-colors group-hover:bg-muted/50">
                <Linkable href={href} className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
                    {c.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.logoUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {initials}
                      </span>
                    )}
                  </div>
                  <span className="truncate">{c.name}</span>
                </Linkable>
              </TableCell>
              <TableCell className="py-1.5 text-muted-foreground transition-colors group-hover:bg-muted/50">
                <Linkable href={href} className="block">
                  {c.company || "—"}
                </Linkable>
              </TableCell>
              <TableCell className="py-1.5 text-muted-foreground transition-colors group-hover:bg-muted/50">
                <Linkable href={href} className="block">
                  {c.email || c.phone || "—"}
                </Linkable>
              </TableCell>
              <TableCell className="py-1.5 text-muted-foreground transition-colors group-hover:bg-muted/50">
                <Linkable href={href} className="block">
                  {location || "—"}
                </Linkable>
              </TableCell>
              <TableCell className="rounded-r-md py-1.5 text-right transition-colors group-hover:bg-muted/50">
                {c.isTaxExempt ? (
                  <Badge variant="info" className="text-[10px]">
                    Tax exempt
                  </Badge>
                ) : null}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/** Wraps cell content in a Link (navigate mode) or a plain div (select mode). */
function Linkable({
  href,
  className,
  children,
}: {
  href?: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return <div className={className}>{children}</div>;
}
