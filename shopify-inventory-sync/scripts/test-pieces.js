#!/usr/bin/env node
/**
 * Prueba recetas, SKUs de pieza y deltas de pintura sin tocar Shopify.
 * Uso: node scripts/test-pieces.js
 */

const assert = require("assert");
const { getRecipe, getJuegoSaleRecipe } = require("../lib/bom/recipes");
const {
  skuForPieceVariant,
  allPieceSkus,
  isPaintedPieceSku,
  isCushionSku,
  matchPieceProduct,
} = require("../lib/bom/pieces");
const { allExpectedComponentSkus } = require("../lib/bom/colors");
const { buildPaintDeltas, buildPaintBatchDeltas } = require("../lib/bom/paint");
const { parseVariantTitle } = require("../lib/bom/parseVariant");
const { calculateWithSharedStructure } = require("../lib/bom/sharedStructureAllocation");

function skusOf(lines) {
  return lines.map((line) => line.sku);
}

const s1 = getRecipe("sillon1", {
  structureColor: "Arena",
  fabricColor: "Beige",
  sofaStyle: "recto",
  title: "Arena / Beige / Recto",
});

assert.deepStrictEqual(
  s1.filter((line) => isPaintedPieceSku(line.sku)).map((line) => `${line.sku}×${line.qty}`),
  ["BAS-S1-AR×1", "RES-S1-AR×1", "LAT-SIL-REC-AR×2"]
);
assert.ok(!skusOf(s1).some((sku) => sku.includes("LAT-SIL-INC") || sku === "LAT-SIL-AR"));

const s1Inc = getRecipe("sillon1", parseVariantTitle("Arena / Beige / Inclinado"));
assert.ok(s1Inc.some((line) => line.sku === "LAT-SIL-INC-AR" && line.qty === 2));
assert.ok(!s1Inc.some((line) => line.sku === "LAT-SIL-REC-AR"));
assert.ok(s1Inc.some((line) => line.sku === "RES-S1-AR"));

const s3 = getRecipe("sillon3", parseVariantTitle("Negro Microtexturado / Gris Claro / Recto"));
assert.deepStrictEqual(
  s3.filter((line) => isPaintedPieceSku(line.sku)).map((line) => `${line.sku}×${line.qty}`),
  ["LAT-SIL-REC-NM×2", "BAS-S3-NM×1", "RES-S3-NM×1"]
);

const mesa = getRecipe("mesa", { structureColor: "Arena" });
assert.deepStrictEqual(
  mesa.filter((line) => isPaintedPieceSku(line.sku)).map((line) => `${line.sku}×${line.qty}`),
  ["LAT-MES-AR×2", "TAB-MES-AR×1"]
);

const reposera = getRecipe("reposera", {
  structureColor: "Arena",
  fabricColor: "Tostado",
  sofaStyle: null,
  title: "Arena / Tostado",
});
assert.deepStrictEqual(
  reposera.filter((line) => isPaintedPieceSku(line.sku)).map((line) => `${line.sku}×${line.qty}`),
  ["BAS-REP-AR×1", "LAT-REP-AR×2", "ACC-REP-AR×1"]
);

assert.strictEqual(skuForPieceVariant("lat_sil_rec", "Natural"), "LAT-SIL-REC");
assert.strictEqual(skuForPieceVariant("lat_sil_inc", "Pintura NM"), "LAT-SIL-INC-PINT-NM");
assert.strictEqual(matchPieceProduct("Pieza Lateral sillon recto")?.key, "lat_sil_rec");
assert.strictEqual(matchPieceProduct("Pieza Lateral sillón inclinado")?.key, "lat_sil_inc");
assert.strictEqual(matchPieceProduct("Pieza Lateral sillón"), null);

const send = buildPaintDeltas({
  pieceKey: "lat_sil_inc",
  color: "NM",
  qty: 4,
  action: "send",
});
assert.deepStrictEqual(
  send.map((d) => `${d.sku}:${d.delta}`),
  ["LAT-SIL-INC:-4", "LAT-SIL-INC-PINT-NM:4"]
);

const batch = buildPaintBatchDeltas({
  action: "send",
  lines: [
    { pieceKey: "lat_mes", color: "NM", qty: 3 },
    { pieceKey: "lat_mes", color: "AR", qty: 2 },
    { pieceKey: "tab_mes", color: "NM", qty: 1 },
  ],
});
assert.deepStrictEqual(
  batch.map((d) => `${d.sku}:${d.delta}`).sort(),
  ["LAT-MES-PINT-AR:2", "LAT-MES-PINT-NM:3", "LAT-MES:-5", "TAB-MES-PINT-NM:1", "TAB-MES:-1"].sort()
);

assert.throws(
  () => buildPaintBatchDeltas({ action: "send", lines: [{ pieceKey: "lat_mes", color: "NM", qty: 0 }] }),
  /Marcá al menos una cantidad/
);

const received = buildPaintBatchDeltas({
  action: "receive",
  lines: [{ pieceKey: "bas_s1", color: "AR", qty: 2 }],
});
assert.deepStrictEqual(
  received.map((d) => `${d.sku}:${d.delta}`),
  ["BAS-S1-PINT-AR:-2", "BAS-S1-AR:2"]
);

const expected = allExpectedComponentSkus();
const pieces = allPieceSkus();
assert.strictEqual(pieces.length, 55);
assert.ok(pieces.every((sku) => expected.includes(sku)));
assert.strictEqual(expected.length, 80);

const stock = new Map([
  ["BAS-S1-AR", 3],
  ["RES-S1-AR", 3],
  ["LAT-SIL-REC-AR", 6],
  ["ALM-B1-658010-BE", 10],
  ["ALM-R1-654412-BE", 10],
  ["CAJA-S1", 10],
  ["LLAVE-ALLEN", 10],
]);

const { fabricableByTitle } = calculateWithSharedStructure(
  [
    {
      title: "Arena / Beige / Recto",
      parsed: parseVariantTitle("Arena / Beige / Recto"),
    },
  ],
  stock,
  (parsed) => getRecipe("sillon1", parsed)
);
assert.strictEqual(fabricableByTitle.get("Arena / Beige / Recto"), 3);

const juego = getJuegoSaleRecipe(parseVariantTitle("Arena / Beige / Inclinado"));
assert.ok(juego.some((line) => line.sku === "LAT-SIL-INC-AR" && line.qty === 6));
assert.ok(!juego.some((line) => String(line.sku).startsWith("LAT-SIL-REC")));
assert.ok(juego.some((line) => line.sku === "BAS-S1-AR" && line.qty === 2));
assert.ok(isCushionSku("ALM-B1-658010-BE"));

console.log("test-pieces: OK");
console.log(`  laterales recto/inclinado; respaldo único`);
console.log(`  ${expected.length} SKUs esperados (${pieces.length} de pieza)`);
