/**
 * Map a distributor's category string onto one of the tenant's own categories.
 *
 * Distributors name categories their own way (SanMar: "T-Shirts",
 * "Polos/Knits", "Sweatshirts/Fleece", "Caps"), so we normalize both sides and
 * match on tokens. Normalization lowercases, drops punctuation, and singularizes;
 * an alias table folds common synonyms ("tee" → tshirt, "cap" → hat,
 * "fleece" → sweatshirt) onto a canonical token. Compound distributor categories
 * are split on /, &, comma, and spaces so any token can match.
 *
 * Returns the matched tenant category id, or null when nothing matches
 * confidently (caller leaves it uncategorized for manual assignment).
 */

const ALIASES: Record<string, string> = {
  tee: "tshirt",
  teeshirt: "tshirt",
  tshirt: "tshirt",
  cap: "hat",
  beanie: "hat",
  hat: "hat",
  fleece: "sweatshirt",
  crewneck: "sweatshirt",
  sweatshirt: "sweatshirt",
  hoody: "hoodie",
  hooded: "hoodie",
  hoodie: "hoodie",
  knit: "polo",
  polo: "polo",
  tank: "tank",
  longsleeve: "longsleeve",
};

/** Lowercase, strip non-alphanumerics, singularize, then fold through aliases. */
function canon(token: string): string {
  const c = token
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .replace(/s$/, "");
  return ALIASES[c] ?? c;
}

function tokensOf(value: string): Set<string> {
  const set = new Set<string>();
  for (const part of value.split(/[/,&]|\s+/)) {
    const c = canon(part);
    if (c) set.add(c);
  }
  // Whole-string canon too, so "Long Sleeve" → "longsleeve" matches as one token.
  const whole = canon(value.replace(/[/,&]/g, " ").replace(/\s+/g, ""));
  if (whole) set.add(whole);
  return set;
}

export function matchTenantCategory(
  distributorCategory: string | null | undefined,
  tenantCategories: { id: string; name: string }[],
): string | null {
  if (!distributorCategory) return null;
  const distTokens = tokensOf(distributorCategory);

  for (const cat of tenantCategories) {
    if (distTokens.has(canon(cat.name))) return cat.id;
    for (const part of cat.name.split(/\s+/)) {
      if (distTokens.has(canon(part))) return cat.id;
    }
  }
  return null;
}
