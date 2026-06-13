/**
 * Generator for the distributor catalog seed (spec §10).
 *
 * Distributor data is SHARED (no tenant_id) — it's the local stand-in for the
 * real PromoStandards/SanMar API, which lands in v0.x. We don't have a script
 * runner wired up, and the project's workflow is pasting SQL into the Supabase
 * SQL editor, so this script doesn't touch the DB: it EMITS idempotent SQL to
 * `drizzle/seed/distributor_catalog.sql`. Re-run after editing the catalog:
 *
 *   node scripts/seed-distributor-catalog.mjs
 *
 * The emitted SQL resolves foreign keys by natural key (source slug, style
 * number) via subselects, and uses ON CONFLICT DO NOTHING so it can be applied
 * repeatedly without duplicating rows.
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "drizzle", "seed", "distributor_catalog.sql");

// Every seeded style is sourced from SanMar for v0.1 (S&S is a stub).
const SOURCE = { slug: "sanmar", name: "SanMar" };

// Standard adult size run + per-size wholesale upcharge (added to base).
const SIZES = [
  { label: "S", up: 0 },
  { label: "M", up: 0 },
  { label: "L", up: 0 },
  { label: "XL", up: 0 },
  { label: "2XL", up: 2 },
  { label: "3XL", up: 3 },
];

// Three representative colorways per style keeps the seed meaningful without
// exploding into thousands of rows. color_hex is approximate.
const COLORS = [
  { name: "Black", hex: "#1A1A1A" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Navy", hex: "#1F2A44" },
];

/**
 * ~30 popular blanks across Gildan, Bella+Canvas, Next Level.
 * base = approximate blank wholesale (USD); used as the S–XL price, with the
 * per-size upcharge added for 2XL/3XL.
 */
const PRODUCTS = [
  // Gildan
  { style: "G500", brand: "Gildan", name: "Heavy Cotton T-Shirt", category: "T-Shirt", base: 2.6 },
  { style: "G640", brand: "Gildan", name: "Softstyle T-Shirt", category: "T-Shirt", base: 2.9 },
  { style: "G800", brand: "Gildan", name: "DryBlend T-Shirt", category: "T-Shirt", base: 2.8 },
  { style: "G2000", brand: "Gildan", name: "Ultra Cotton T-Shirt", category: "T-Shirt", base: 3.1 },
  {
    style: "G185",
    brand: "Gildan",
    name: "Heavy Blend Hooded Sweatshirt",
    category: "Hoodie",
    base: 9.5,
  },
  {
    style: "G125",
    brand: "Gildan",
    name: "DryBlend Crewneck Sweatshirt",
    category: "Sweatshirt",
    base: 8.2,
  },
  {
    style: "G180",
    brand: "Gildan",
    name: "Heavy Blend Crewneck Sweatshirt",
    category: "Sweatshirt",
    base: 8.6,
  },
  {
    style: "G184",
    brand: "Gildan",
    name: "Heavy Blend Full-Zip Hoodie",
    category: "Hoodie",
    base: 11.4,
  },
  {
    style: "G470",
    brand: "Gildan",
    name: "Performance Long Sleeve T-Shirt",
    category: "Long Sleeve",
    base: 5.2,
  },
  {
    style: "G540",
    brand: "Gildan",
    name: "Heavy Cotton Long Sleeve T-Shirt",
    category: "Long Sleeve",
    base: 4.4,
  },
  {
    style: "G420",
    brand: "Gildan",
    name: "Performance Core T-Shirt",
    category: "T-Shirt",
    base: 3.4,
  },
  { style: "G670", brand: "Gildan", name: "Performance Polo", category: "Polo", base: 6.1 },
  // Bella+Canvas
  {
    style: "3001C",
    brand: "Bella+Canvas",
    name: "Unisex Jersey Short Sleeve Tee",
    category: "T-Shirt",
    base: 3.6,
  },
  {
    style: "3001CVC",
    brand: "Bella+Canvas",
    name: "Unisex Heather CVC Tee",
    category: "T-Shirt",
    base: 4.0,
  },
  {
    style: "3413",
    brand: "Bella+Canvas",
    name: "Unisex Triblend Tee",
    category: "T-Shirt",
    base: 5.0,
  },
  {
    style: "3501",
    brand: "Bella+Canvas",
    name: "Unisex Long Sleeve Jersey Tee",
    category: "Long Sleeve",
    base: 6.2,
  },
  {
    style: "3719",
    brand: "Bella+Canvas",
    name: "Unisex Sponge Fleece Pullover Hoodie",
    category: "Hoodie",
    base: 16.5,
  },
  {
    style: "3739",
    brand: "Bella+Canvas",
    name: "Unisex Sponge Fleece Full-Zip Hoodie",
    category: "Hoodie",
    base: 19.0,
  },
  {
    style: "3945",
    brand: "Bella+Canvas",
    name: "Unisex Sponge Fleece Crewneck",
    category: "Sweatshirt",
    base: 14.0,
  },
  {
    style: "6004",
    brand: "Bella+Canvas",
    name: "Women's The Favorite Tee",
    category: "T-Shirt",
    base: 3.8,
  },
  { style: "8800", brand: "Bella+Canvas", name: "Women's Flowy Tank", category: "Tank", base: 4.6 },
  { style: "3480", brand: "Bella+Canvas", name: "Unisex Jersey Tank", category: "Tank", base: 3.5 },
  // Next Level
  { style: "3600", brand: "Next Level", name: "Unisex Cotton Tee", category: "T-Shirt", base: 3.5 },
  { style: "6210", brand: "Next Level", name: "Unisex CVC Tee", category: "T-Shirt", base: 3.9 },
  {
    style: "6010",
    brand: "Next Level",
    name: "Unisex Triblend Tee",
    category: "T-Shirt",
    base: 4.8,
  },
  { style: "6410", brand: "Next Level", name: "Unisex Sueded Tee", category: "T-Shirt", base: 4.5 },
  {
    style: "3633",
    brand: "Next Level",
    name: "Unisex Long Sleeve Tee",
    category: "Long Sleeve",
    base: 5.6,
  },
  {
    style: "9001",
    brand: "Next Level",
    name: "Unisex French Terry Pullover Hoodie",
    category: "Hoodie",
    base: 15.0,
  },
  {
    style: "9301",
    brand: "Next Level",
    name: "Unisex Sponge Fleece Pullover Hoodie",
    category: "Hoodie",
    base: 15.8,
  },
  {
    style: "5030",
    brand: "Next Level",
    name: "Women's Ideal Racerback Tank",
    category: "Tank",
    base: 4.2,
  },
];

const sqlStr = (v) =>
  v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`;
const sqlNum = (v) => (v === null || v === undefined ? "null" : String(v));

function colorAbbrev(name) {
  return name
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 3)
    .toUpperCase();
}

const lines = [];
lines.push("-- ════════════════════════════════════════════════════════════════════");
lines.push("-- Distributor catalog seed (shared data — no tenant_id).");
lines.push("-- Generated by scripts/seed-distributor-catalog.mjs — do not edit by hand.");
lines.push("-- Apply AFTER 0006_kind_betty_brant.sql. Idempotent (ON CONFLICT DO NOTHING).");
lines.push("-- ════════════════════════════════════════════════════════════════════");
lines.push("");
lines.push(
  `INSERT INTO distributor_sources (slug, name) VALUES (${sqlStr(SOURCE.slug)}, ${sqlStr(SOURCE.name)}) ON CONFLICT (slug) DO NOTHING;`,
);
lines.push(
  "INSERT INTO distributor_sources (slug, name) VALUES ('ssactivewear', 'S&S Activewear') ON CONFLICT (slug) DO NOTHING;",
);
lines.push("");

let variantCount = 0;
for (const p of PRODUCTS) {
  const desc = `${p.brand} ${p.style} — ${p.name}`;
  lines.push(`-- ${p.brand} ${p.style}`);
  lines.push(
    "INSERT INTO distributor_products (distributor_id, style_number, brand, name, description, category)",
  );
  lines.push(
    `SELECT id, ${sqlStr(p.style)}, ${sqlStr(p.brand)}, ${sqlStr(p.name)}, ${sqlStr(desc)}, ${sqlStr(p.category)}`,
  );
  lines.push(`FROM distributor_sources WHERE slug = ${sqlStr(SOURCE.slug)}`);
  lines.push("ON CONFLICT (distributor_id, style_number) DO NOTHING;");

  const values = [];
  for (const color of COLORS) {
    for (const size of SIZES) {
      const price = (p.base + size.up).toFixed(2);
      const sku = `${p.style}-${colorAbbrev(color.name)}-${size.label}`;
      values.push(
        `    (${sqlStr(color.name)}, ${sqlStr(color.hex)}, ${sqlStr(size.label)}, ${sqlStr(sku)}, ${sqlNum(price)}, 500)`,
      );
      variantCount++;
    }
  }
  lines.push(
    "INSERT INTO distributor_product_variants (distributor_product_id, color_name, color_hex, size_label, sku, wholesale_price, inventory_quantity)",
  );
  lines.push(
    "SELECT dp.id, v.color_name, v.color_hex, v.size_label, v.sku, v.wholesale_price, v.inventory_quantity",
  );
  lines.push("FROM distributor_products dp");
  lines.push("JOIN distributor_sources ds ON ds.id = dp.distributor_id");
  lines.push(
    `CROSS JOIN (VALUES\n${values.join(",\n")}\n) AS v(color_name, color_hex, size_label, sku, wholesale_price, inventory_quantity)`,
  );
  lines.push(`WHERE ds.slug = ${sqlStr(SOURCE.slug)} AND dp.style_number = ${sqlStr(p.style)}`);
  lines.push("ON CONFLICT (distributor_product_id, color_name, size_label) DO NOTHING;");
  lines.push("");
}

lines.push(
  `-- Seeded ${PRODUCTS.length} styles × ${COLORS.length} colors × ${SIZES.length} sizes = ${variantCount} variants.`,
);

writeFileSync(OUT, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${OUT}`);
console.log(`${PRODUCTS.length} products, ${variantCount} variants.`);
