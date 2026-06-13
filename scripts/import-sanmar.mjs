/**
 * Import the SanMar SDL bulk CSV into the shared distributor catalog tables.
 *
 *   node --env-file=.env.local scripts/import-sanmar.mjs
 *
 * Replaces the seeded fakes with the real catalog (~3,899 styles / ~416K SKUs).
 * Direct DB load via the `postgres` client — pasting 416K rows of SQL into the
 * Supabase editor isn't viable. Idempotent: upserts on natural keys, so a fresh
 * re-download can be re-run without wiping tenant links.
 *
 * Two streaming passes over the 507MB file:
 *   1. Aggregate per-style → upsert `distributor_products` (with denormalized
 *      color_count + min_price), then build a style# → product id map.
 *   2. Stream again → upsert `distributor_product_variants` in batches.
 *
 * Cost basis = PIECE_PRICE (Option 1). case_price + case_size are stored but
 * unused until quantity-aware pricing (Option 3) lands.
 */
import { createReadStream, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, "data", "SanMar_SDL_D.csv");
const SOURCE_SLUG = "sanmar";
const SOURCE_NAME = "SanMar";
const VARIANT_BATCH = 1000;

/**
 * Read DATABASE_URL — prefer the process env, else parse .env.local ourselves.
 * Node's `--env-file` flag is finicky (CRLF / quoting), so we don't rely on it.
 */
function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
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
      if (eq === -1) continue;
      if (line.slice(0, eq).trim() !== "DATABASE_URL") continue;
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      return val;
    }
  }
  return null;
}

const connectionString = loadDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL not found in environment or .env.local");
  process.exit(1);
}
const sql = postgres(connectionString, { prepare: false, max: 1 });

// Quote-aware CSV field splitter (proven on this exact file in the pricing analysis).
function splitCsv(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

const clean = (v) => {
  if (v === undefined || v === null) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};
const numOrNull = (v) => {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
};
const intOrNull = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

function makeLineReader() {
  return createInterface({
    input: createReadStream(FILE),
    crlfDelay: Number.POSITIVE_INFINITY,
  });
}

/** Resolve header → column index map once. */
function resolveIndices(headerCols) {
  const h = headerCols.map((c) => c.replace(/^﻿/, "").trim());
  const need = {
    style: "STYLE#",
    title: "PRODUCT_TITLE",
    description: "PRODUCT_DESCRIPTION",
    category: "CATEGORY_NAME",
    brand: "MILL",
    color: "COLOR_NAME",
    size: "SIZE",
    sku: "UNIQUE_KEY",
    piece: "PIECE_PRICE",
    caseP: "CASE_PRICE",
    caseSize: "CASE_SIZE",
    image: "FRONT_MODEL_IMAGE_URL",
  };
  const idx = {};
  for (const [key, col] of Object.entries(need)) {
    const i = h.indexOf(col);
    if (i === -1) throw new Error(`Expected column "${col}" not found in CSV header`);
    idx[key] = i;
  }
  return idx;
}

async function main() {
  const started = Date.now();
  console.log("SanMar import starting…");

  // Ensure the distributor source exists, get its id.
  const [source] = await sql`
    INSERT INTO distributor_sources (slug, name)
    VALUES (${SOURCE_SLUG}, ${SOURCE_NAME})
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `;
  const distributorId = source.id;

  // ── Pass 1: aggregate per style ──────────────────────────────────────
  console.log("Pass 1/2 — aggregating styles…");
  const styles = new Map(); // style# -> { brand, name, description, category, image, colors:Set, minPrice }
  let idx = null;
  let rowCount = 0;

  {
    const rl = makeLineReader();
    for await (const line of rl) {
      if (!line.trim()) continue;
      const cols = splitCsv(line);
      if (!idx) {
        idx = resolveIndices(cols);
        continue;
      }
      const style = clean(cols[idx.style]);
      if (!style) continue;
      rowCount++;

      let agg = styles.get(style);
      if (!agg) {
        agg = {
          brand: clean(cols[idx.brand]) ?? "Unknown",
          name: clean(cols[idx.title]) ?? style,
          description: clean(cols[idx.description]),
          category: clean(cols[idx.category]),
          image: null,
          colors: new Set(),
          minPrice: null,
        };
        styles.set(style, agg);
      }
      const color = clean(cols[idx.color]);
      if (color) agg.colors.add(color);
      const piece = numOrNull(cols[idx.piece]);
      if (piece !== null && (agg.minPrice === null || piece < agg.minPrice)) agg.minPrice = piece;
      if (!agg.image) {
        const img = clean(cols[idx.image]);
        if (img) agg.image = img;
      }
    }
  }
  console.log(
    `  ${rowCount.toLocaleString()} rows → ${styles.size.toLocaleString()} unique styles`,
  );

  // ── Upsert products ──────────────────────────────────────────────────
  console.log("Upserting products…");
  const productRows = [];
  for (const [style, agg] of styles) {
    productRows.push({
      distributor_id: distributorId,
      style_number: style,
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
    const batch = productRows.slice(i, i + 500);
    await sql`
      INSERT INTO distributor_products ${sql(
        batch,
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

  // Build style# -> product id map.
  const idRows = await sql`
    SELECT id, style_number FROM distributor_products WHERE distributor_id = ${distributorId}
  `;
  const productIdByStyle = new Map(idRows.map((r) => [r.style_number, r.id]));
  console.log(`  ${productIdByStyle.size.toLocaleString()} products in catalog`);

  // ── Pass 2: upsert variants in batches ───────────────────────────────
  console.log("Pass 2/2 — upserting variants…");
  let variantBatch = [];
  let variantTotal = 0;
  let dupSkipped = 0;
  // SanMar repeats whole styles across category groupings, so the same
  // (product, color, size) appears multiple times. Track seen keys and skip
  // repeats — Postgres can't ON CONFLICT the same target twice in one batch.
  const seenVariants = new Set();

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
    if (variantTotal % 50000 < VARIANT_BATCH) {
      console.log(`  …${variantTotal.toLocaleString()} variants`);
    }
    variantBatch = [];
  }

  {
    const rl = makeLineReader();
    let header = true;
    for await (const line of rl) {
      if (!line.trim()) continue;
      if (header) {
        header = false;
        continue;
      }
      const cols = splitCsv(line);
      const style = clean(cols[idx.style]);
      const color = clean(cols[idx.color]);
      const size = clean(cols[idx.size]);
      if (!style || !color || !size) continue;
      const productId = productIdByStyle.get(style);
      if (!productId) continue;

      const dedupeKey = `${productId}|${color}|${size}`;
      if (seenVariants.has(dedupeKey)) {
        dupSkipped++;
        continue;
      }
      seenVariants.add(dedupeKey);

      const piece = numOrNull(cols[idx.piece]);
      const caseP = numOrNull(cols[idx.caseP]);
      variantBatch.push({
        distributor_product_id: productId,
        color_name: color,
        size_label: size,
        sku: clean(cols[idx.sku]),
        wholesale_price: piece === null ? null : piece.toFixed(2),
        case_price: caseP === null ? null : caseP.toFixed(2),
        case_size: intOrNull(cols[idx.caseSize]),
      });
      if (variantBatch.length >= VARIANT_BATCH) await flush();
    }
    await flush();
  }

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `Done. ${productIdByStyle.size.toLocaleString()} styles, ${variantTotal.toLocaleString()} variants (${dupSkipped.toLocaleString()} dup rows skipped) in ${secs}s.`,
  );
  await sql.end();
}

main().catch(async (err) => {
  console.error("Import failed:", err);
  await sql.end();
  process.exit(1);
});
