/**
 * One-off analysis: compare PIECE_PRICE vs DOZENS_PRICE vs CASE_PRICE in the
 * SanMar SDL CSV to decide whether blank cost drops at case quantity.
 * Quote-aware line parser so commas inside descriptions/quoted fields don't
 * misalign columns. Run: node scripts/analyze-sanmar-pricing.mjs
 */
import { createReadStream } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, "data", "SanMar_SDL_D.csv");

// Minimal RFC-4180-ish field splitter for one line.
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

const rl = createInterface({ input: createReadStream(FILE), crlfDelay: Number.POSITIVE_INFINITY });

let header = null;
let idx = {};
let total = 0;
let caseLowerThanPiece = 0;
let caseEqualPiece = 0;
let caseHigherThanPiece = 0;
let dozenDiffersFromPiece = 0;
const examples = [];

for await (const line of rl) {
  if (!line.trim()) continue;
  const cols = splitCsv(line);
  if (!header) {
    header = cols.map((c) => c.replace(/^﻿/, "").trim());
    idx = {
      style: header.indexOf("STYLE#"),
      color: header.indexOf("COLOR_NAME"),
      size: header.indexOf("SIZE"),
      piece: header.indexOf("PIECE_PRICE"),
      dozen: header.indexOf("DOZENS_PRICE"),
      caseP: header.indexOf("CASE_PRICE"),
    };
    continue;
  }
  const piece = Number.parseFloat(cols[idx.piece]);
  const dozen = Number.parseFloat(cols[idx.dozen]);
  const caseP = Number.parseFloat(cols[idx.caseP]);
  if (Number.isNaN(piece) || Number.isNaN(caseP)) continue;
  total++;

  if (caseP < piece) caseLowerThanPiece++;
  else if (caseP === piece) caseEqualPiece++;
  else caseHigherThanPiece++;

  if (!Number.isNaN(dozen) && dozen !== piece) dozenDiffersFromPiece++;

  if (examples.length < 8 && caseP < piece) {
    examples.push(
      `${cols[idx.style]} ${cols[idx.color]}/${cols[idx.size]}: piece $${piece} | dozen $${dozen} | case $${caseP}`,
    );
  }
}

const pct = (n) => `${((n / total) * 100).toFixed(1)}%`;
console.log(`Total priced rows: ${total.toLocaleString()}`);
console.log("");
console.log(
  `CASE cheaper than PIECE: ${caseLowerThanPiece.toLocaleString()} (${pct(caseLowerThanPiece)})`,
);
console.log(`CASE same as PIECE:      ${caseEqualPiece.toLocaleString()} (${pct(caseEqualPiece)})`);
console.log(
  `CASE higher than PIECE:  ${caseHigherThanPiece.toLocaleString()} (${pct(caseHigherThanPiece)})`,
);
console.log(
  `DOZEN differs from PIECE: ${dozenDiffersFromPiece.toLocaleString()} (${pct(dozenDiffersFromPiece)})`,
);
console.log("");
console.log("Examples where case < piece:");
for (const e of examples) console.log(`  ${e}`);
