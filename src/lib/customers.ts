/**
 * Two-letter initials for a customer avatar fallback. Prefers the company
 * name, falls back to the contact name. Returns "?" when both are empty.
 */
export function customerInitials(name: string, company: string | null): string {
  const source = (company || name).trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? source;
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  return ((first[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}
