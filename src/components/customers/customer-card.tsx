import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { customerInitials } from "@/lib/customers";
import { cn } from "@/lib/utils";

/** Shared shape for the customer card + list view (page and picker). */
export type CustomerSummary = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  isTaxExempt: boolean;
  logoUrl: string | null;
};

/**
 * Customer card. Default: links to the detail page. With `onSelect`: renders a
 * button that calls it instead (used by the quote builder's picker dialog) —
 * identical look either way.
 */
export function CustomerCard({
  customer,
  onSelect,
}: {
  customer: CustomerSummary;
  onSelect?: () => void;
}) {
  const { id, name, company, email, phone, city, state, isTaxExempt, logoUrl } = customer;
  const location = [city, state].filter(Boolean).join(", ");
  const initials = customerInitials(name, company);

  const body = (
    <Card className="relative h-full overflow-hidden border-transparent bg-sidebar p-4 text-left transition-colors hover:bg-sidebar-accent/50">
      {isTaxExempt ? (
        <Badge variant="info" className="absolute top-3 right-3 text-[10px]">
          Tax exempt
        </Badge>
      ) : null}

      <div className="flex items-center gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/40">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="size-full object-contain" />
          ) : (
            <span className="text-base font-medium text-muted-foreground">{initials}</span>
          )}
        </div>
        <div className={cn("min-w-0 flex-1", isTaxExempt && "pr-16")}>
          <div className="truncate text-base font-semibold leading-tight">{name}</div>
          <div className="mt-0.5 truncate text-sm text-muted-foreground">{company || "—"}</div>
        </div>
      </div>

      <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
        {email ? (
          <div className="flex items-center gap-1.5">
            <Mail className="size-3.5 shrink-0" />
            <span className="truncate">{email}</span>
          </div>
        ) : null}
        {phone ? (
          <div className="flex items-center gap-1.5">
            <Phone className="size-3.5 shrink-0" />
            <span className="truncate">{phone}</span>
          </div>
        ) : null}
        {location ? (
          <div className="flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        ) : null}
        {!email && !phone && !location ? (
          <div className="text-muted-foreground/60">No contact info yet</div>
        ) : null}
      </div>
    </Card>
  );

  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className="group block w-full">
        {body}
      </button>
    );
  }
  return (
    <Link href={`/customers/${id}`} className="group block">
      {body}
    </Link>
  );
}
