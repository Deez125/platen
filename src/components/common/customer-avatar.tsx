import { customerInitials } from "@/lib/customers";
import { cn } from "@/lib/utils";

/**
 * Customer logo (or initials fallback) used across the list/grid views.
 * `name` is the already-resolved display name (company or contact).
 */
export function CustomerAvatar({
  name,
  logoUrl,
  size = "sm",
}: {
  name: string;
  logoUrl: string | null;
  size?: "sm" | "lg";
}) {
  const box = size === "lg" ? "size-16 rounded-md" : "size-8 rounded-md";
  const text = size === "lg" ? "text-base" : "text-[11px]";
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center overflow-hidden bg-muted/40", box)}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="size-full object-contain" />
      ) : (
        <span className={cn("font-medium text-muted-foreground", text)}>
          {customerInitials(name, null)}
        </span>
      )}
    </div>
  );
}

/** Avatar + name, for a table cell. */
export function CustomerCell({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return (
    <div className="flex items-center gap-2.5">
      <CustomerAvatar name={name} logoUrl={logoUrl} size="sm" />
      <span className="truncate">{name}</span>
    </div>
  );
}
