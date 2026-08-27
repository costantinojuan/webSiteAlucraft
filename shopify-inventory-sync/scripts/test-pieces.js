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
const { buildPaintDeltas } = require("../lib/bom/paint");
const { calculateWithSharedStructure } = require("../lib/bom/sharedStructureAllocation");

function skusOf(lines) {
  return lines.map((line) => line.sku);
}

const s1 = getRecipe("sillon1", {
  structureColor: "Arena",
  fabricColor: "Beige",
});

assert.deepStrictEqual(
  s1.filter((line) => isPaintedPieceSku(line.sku)).map((line) => `${line.sku}×${line.qty}`),
  ["BAS-S1-AR×1", "RES-S1-AR×1", "LAT-SIL-AR×2"]
);
assert.ok(!skusOf(s1).some((sku) => sku.startsWith("EST-") || sku.startsWith("MES-RAT")));
assert.ok(skusOf(s1).includes("ALM-B1-658010-BE"));
assert.ok(skusOf(s1).includes("CAJA-S1"));
assert.ok(skusOf(s1).includes("LLAVE-ALLEN"));

const s3 = getRecipe("sillon3", {
  structureColor: "Negro Microtexturado",
  fabricColor: "Gris Claro",
});
assert.deepStrictEqual(
  s3.filter((line) => isPaintedPieceSku(line.sku)).map((line) => `${line.sku}×${line.qty}`),
  ["LAT-SIL-NM×2", "BAS-S3-NM×1", "RES-S3-NM×1"]
);

const mesa = getRecipe("mesa", { structureColor: "Arena" });
assert.deepStrictEqual(
  mesa.filter((line) => isPaintedPieceSku(line.sku)).map((line) => `${line.sku}×${line.qty}`),
  ["LAT-MES-AR×2", "TAB-MES-AR×1"]
);

const reposera = getRecipe("reposera", {
  structureColor: "Arena",
  fabricColor: "Tostado",
});
assert.deepStrictEqual(
  reposera.filter((line) => isPaintedPieceSku(line.sku)).map((line) => `${line.sku}×${line.qty}`),
  ["BAS-REP-AR×1", "LAT-REP-AR×2", "ACC-REP-AR×1"]
);

assert.strictEqual(skuForPieceVariant("lat_sil", "Natural"), "LAT-SIL");
assert.strictEqual(skuForPieceVariant("lat_sil", "Pintura NM"), "LAT-SIL-PINT-NM");
assert.strictEqual(skuForPieceVariant("lat_sil", "Pintura AR"), "LAT-SIL-PINT-AR");
assert.strictEqual(skuForPieceVariant("lat_sil", "Negro Microtexturado"), "LAT-SIL-NM");
assert.strictEqual(skuForPieceVariant("lat_sil", "En pintura · Negro Microtexturado"), "LAT-SIL-PINT-NM");
assert.strictEqual(skuForPieceVariant("lat_sil", "En pintura · Arena"), "LAT-SIL-PINT-AR");
assert.strictEqual(matchPieceProduct("Pieza Lateral sillon")?.key, "lat_sil");

assert.strictEqual(matchPieceProduct("Pieza Lateral mesa")?.key, "lat_mes");
assert.strictEqual(matchPieceProduct("Pieza Lateral sillón")?.key, "lat_sil");
assert.strictEqual(matchPieceProduct("Estructura Sillón 1 Cuerpo"), null);

const send = buildPaintDeltas({
  pieceKey: "lat_sil",
  color: "NM",
  qty: 4,
  action: "send",
});
assert.deepStrictEqual(
  send.map((d) => `${d.sku}:${d.delta}`),
  ["LAT-SIL:-4", "LAT-SIL-PINT-NM:4"]
);

const receive = buildPaintDeltas({
  pieceKey: "lat_sil",
  color: "NM",
  qty: 4,
  action: "receive",
});
assert.deepStrictEqual(
  receive.map((d) => `${d.sku}:${d.delta}`),
  ["LAT-SIL-PINT-NM:-4", "LAT-SIL-NM:4"]
);

const expected = allExpectedComponentSkus();
const pieces = allPieceSkus();
assert.strictEqual(pieces.length, 50);
assert.ok(pieces.every((sku) => expected.includes(sku)));
assert.ok(!expected.some((sku) => sku.startsWith("EST-") || sku.startsWith("MES-RAT")));
assert.strictEqual(expected.length, 75);

const stock = new Map([
  ["BAS-S1-AR", 3],
  ["RES-S1-AR", 3],
  ["LAT-SIL-AR", 6],
  ["ALM-B1-658010-BE", 10],
  ["ALM-R1-654412-BE", 10],
  ["CAJA-S1", 10],
  ["LLAVE-ALLEN", 10],
]);

const { fabricableByTitle } = calculateWithSharedStructure(
  [{ title: "Arena / Beige", parsed: { structureColor: "Arena", fabricColor: "Beige" } }],
  stock,
  (parsed) => getRecipe("sillon1", parsed)
);
assert.strictEqual(fabricableByTitle.get("Arena / Beige"), 3);

const juego = getJuegoSaleRecipe({
  title: "Arena / Beige",
  structureColor: "Arena",
  fabricColor: "Beige",
});
assert.ok(juego.some((line) => line.sku === "LAT-SIL-AR" && line.qty === 6));
assert.ok(juego.some((line) => line.sku === "BAS-S1-AR" && line.qty === 2));
assert.ok(isCushionSku("ALM-B1-658010-BE"));
assert.ok(!isCushionSku("LAT-SIL-AR"));

console.log("test-pieces: OK");
console.log(`  recetas usan piezas pintadas (no EST/MES-RAT)`);
console.log(`  ${expected.length} SKUs esperados (${pieces.length} de pieza)`);
console.log(`  pintura send/receive 1:1`);
