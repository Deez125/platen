/**
 * Import the S&S Activewear catalog (REST API) into the shared distributor
 * catalog tables, under the `ssactivewear` source.
 *
 *   node scripts/import-ss.mjs          # full catalog (~5,700 styles)
 *   node scripts/import-ss.mjs 25       # first 25 styles (smoke test)
 *
 * S&S can't return "all products" in one call, so we: (1) GET /v2/styles/ once
 * for style-level metadata, then (2) GET /v2/products/?styleid=<batch> for the
 * SKU rows (colors/sizes/prices), batching styleIDs to keep call count low.
 * Idempotent: upserts on natural keys, so re-running refreshes prices without
 * wiping tenant links. Cost basis = customerPrice (your net), falling back to
 * piecePrice. Mirrors import-sanmar.mjs.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_SLUG = "ssactivewear";
const SOURCE_NAME = "S&S Activewear";
const API_BASE = "https://api.ssactivewear.com/v2";
const CDN_BASE = "https://cdn.ssactivewear.com/";
const STYLE_BATCH = 50; // styleIDs per /products request
const VARIANT_BATCH = 1000; // rows per DB upsert
const LIMIT = Number.parseInt(process.argv[2] ?? "", 10) || null; // optional style cap

/** Read a var from process.env, else parse it out of .env.local ourselves. */
function envVal(name) {
  if (process.env[name]) return process.env[name];
  const candidates = [join(process.cwd(), ".env.local"), join(__dirname, "..", ".env.local")];
  for (const path of candidates) {
    let raw;
    try {
      raw = readFileSync(path, "utf8");
    } catch {
      continue;
    }
    for (const rawLine of raw.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1 || line.slice(0, eq).trim() !== name) continue;
      let v = line.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      return v;
    }
  }
  return null;
}

const connectionString = envVal("DATABASE_URL");
const account = envVal("SS_ACCOUNT_NUMBER");
const apiKey = envVal("SS_API_KEY");
if (!connectionString) {
  console.error("DATABASE_URL not found in environment or .env.local");
  process.exit(1);
}
if (!account || !apiKey) {
  console.error("SS_ACCOUNT_NUMBER / SS_API_KEY not found in .env.local");
  process.exit(1);
}

const auth = `Basic ${Buffer.from(`${account}:${apiKey}`).toString("base64")}`;
const sql = postgres(connectionString, { prepare: false, max: 1 });

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: auth,
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; apparel-shop-saas/1.0)",
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

const num = (v) => {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
};
const intOrNull = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};
const clean = (v) => {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t.length === 0 ? null : t;
};
/** Strip HTML tags + decode the few entities S&S descriptions use. */
function stripHtml(html) {
  if (!html) return null;
  const text = String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.length === 0 ? null : text;
}
/** Relative S&S image path → absolute CDN URL. */
const imgUrl = (rel) => {
  const r = clean(rel);
  return r ? `${CDN_BASE}${r.replace(/^\/+/, "")}` : null;
};
/** Cost basis: your net (customerPrice), falling back to list piecePrice. */
function costOf(p) {
  const cust = num(p.customerPrice);
  if (cust !== null && cust > 0) return cust;
  return num(p.piecePrice);
}

async function main() {
  const started = Date.now();
  console.log(`S&S import starting…${LIMIT ? ` (limited to ${LIMIT} styles)` : ""}`);

  const [source] = await sql`
    INSERT INTO distributor_sources (slug, name)
    VALUES (${SOURCE_SLUG}, ${SOURCE_NAME})
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `;
  const distributorId = source.id;

  // ── Pass 1: all styles (one call) → style-level metadata ──────────────
  console.log("Pass 1/2 — fetching styles…");
  let styles = await apiGet("/styles/");
  if (!Array.isArray(styles)) styles = [styles];
  if (LIMIT) styles = styles.slice(0, LIMIT);
  console.log(`  ${styles.length.toLocaleString()} styles`);

  // styleID -> { meta..., colors:Set, minPrice } ; partNumber is our style_number.
  const byStyleId = new Map();
  for (const s of styles) {
    const styleId = s.styleID;
    const partNumber = clean(s.partNumber);
    if (styleId == null || !partNumber) continue;
    byStyleId.set(styleId, {
      partNumber,
      brand: clean(s.brandName) ?? "Unknown",
      name: clean(s.title) ?? clean(s.styleName) ?? partNumber,
      description: stripHtml(s.description),
      category: clean(s.baseCategory),
      image: imgUrl(s.styleImage),
      colors: new Set(),
      minPrice: null,
    });
  }

  // ── Pass 2: products per styleID batch → SKU rows + aggregates ────────
  console.log("Pass 2/2 — fetching products in batches…");
  const styleIds = [...byStyleId.keys()];
  const skuRows = []; // { styleId, color, size, sizeOrder, sku, cost, casePrice, caseQty }
  const fields = "sku,styleID,colorName,sizeName,sizeOrder,customerPrice,piecePrice,casePrice,caseQty";

  for (let i = 0; i < styleIds.length; i += STYLE_BATCH) {
    const batch = styleIds.slice(i, i + STYLE_BATCH);
    let products = await apiGet(`/products/?styleid=${batch.join(",")}&fields=${fields}`);
    if (!Array.isArray(products)) products = products ? [products] : [];
    for (const p of products) {
      const agg = byStyleId.get(p.styleID);
      if (!agg) continue;
      const color = clean(p.colorName);
      const size = clean(p.sizeName);
      if (!color || !size) continue;
      const cost = costOf(p);
      if (color) agg.colors.add(color);
      if (cost !== null && (agg.minPrice === null || cost < agg.minPrice)) agg.minPrice = cost;
      skuRows.push({
        styleId: p.styleID,
        color,
        size,
        sku: clean(p.sku),
        cost,
        casePrice: num(p.casePrice),
        caseQty: intOrNull(p.caseQty),
      });
    }
    if ((i / STYLE_BATCH) % 10 === 0) {
      console.log(`  …${Math.min(i + STYLE_BATCH, styleIds.length)}/${styleIds.length} styles`);
    }
  }
  console.log(`  ${skuRows.length.toLocaleString()} SKU rows`);

  // ── Upsert products ───────────────────────────────────────────────────
  console.log("Upserting products…");
  const productRows = [];
  for (const agg of byStyleId.values()) {
    productRows.push({
      distributor_id: distributorId,
      style_number: agg.partNumber,
      brand: agg.brand,
      name: agg.name,
      description: agg.description,
      category: agg.category,
      image_url: agg.image,
      color_count: agg.colors.size,
      min_price: agg.minPrice === null ? null : agg.minPrice.toFixed(2),
      is_active: true,
    });
  }
  for (let i = 0; i < productRows.length; i += 500) {
    const b = productRows.slice(i, i + 500);
    await sql`
      INSERT INTO distributor_products ${sql(
        b,
        "distributor_id",
        "style_number",
        "brand",
        "name",
        "description",
        "category",
        "image_url",
        "color_count",
        "min_price",
        "is_active",
      )}
      ON CONFLICT (distributor_id, style_number) DO UPDATE SET
        brand = EXCLUDED.brand,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        image_url = EXCLUDED.image_url,
        color_count = EXCLUDED.color_count,
        min_price = EXCLUDED.min_price,
        is_active = EXCLUDED.is_active,
        last_synced_at = now(),
        updated_at = now()
    `;
  }

  // style_number (partNumber) -> product id, then styleID -> product id.
  const idRows = await sql`
    SELECT id, style_number FROM distributor_products WHERE distributor_id = ${distributorId}
  `;
  const productIdByPart = new Map(idRows.map((r) => [r.style_number, r.id]));
  const productIdByStyleId = new Map();
  for (const [styleId, agg] of byStyleId) {
    const pid = productIdByPart.get(agg.partNumber);
    if (pid) productIdByStyleId.set(styleId, pid);
  }
  console.log(`  ${productIdByPart.size.toLocaleString()} products in catalog`);

  // ── Upsert variants ───────────────────────────────────────────────────
  console.log("Upserting variants…");
  let variantBatch = [];
  let variantTotal = 0;
  let dupSkipped = 0;
  const seen = new Set();

  async function flush() {
    if (variantBatch.length === 0) return;
    await sql`
      INSERT INTO distributor_product_variants ${sql(
        variantBatch,
        "distributor_product_id",
        "color_name",
        "size_label",
        "sku",
        "wholesale_price",
        "case_price",
        "case_size",
      )}
      ON CONFLICT (distributor_product_id, color_name, size_label) DO UPDATE SET
        sku = EXCLUDED.sku,
        wholesale_price = EXCLUDED.wholesale_price,
        case_price = EXCLUDED.case_price,
        case_size = EXCLUDED.case_size,
        updated_at = now()
    `;
    variantTotal += variantBatch.length;
    variantBatch = [];
  }

  for (const r of skuRows) {
    const productId = productIdByStyleId.get(r.styleId);
    if (!productId) continue;
    const key = `${productId}|${r.color}|${r.size}`;
    if (seen.has(key)) {
      dupSkipped++;
      continue;
    }
    seen.add(key);
    variantBatch.push({
      distributor_product_id: productId,
      color_name: r.color,
      size_label: r.size,
      sku: r.sku,
      wholesale_price: r.cost === null ? null : r.cost.toFixed(2),
      case_price: r.casePrice === null ? null : r.casePrice.toFixed(2),
      case_size: r.caseQty,
    });
    if (variantBatch.length >= VARIANT_BATCH) await flush();
  }
  await flush();

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `Done. ${productIdByPart.size.toLocaleString()} styles, ${variantTotal.toLocaleString()} variants (${dupSkipped.toLocaleString()} dup rows skipped) in ${secs}s.`,
  );
  await sql.end();
}

main().catch(async (err) => {
  console.error("Import failed:", err);
  await sql.end();
  process.exit(1);
});
