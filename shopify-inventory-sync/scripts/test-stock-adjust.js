#!/usr/bin/env node
const assert = require("assert");
const { buildStockAdjustDeltas } = require("../lib/bom/stockAdjust");

const stock = new Map([
  ["LAT-MES", 8],
  ["CAJA-S1", 0],
  ["ALM-B1-658010-BE", 3],
]);

const added = buildStockAdjustDeltas({
  mode: "add",
  stockBySku: stock,
  lines: [
    { sku: "LAT-MES", qty: 4, label: "Lateral mesa Natural" },
    { sku: "CAJA-S1", qty: 2, label: "Caja S1" },
    { sku: "ALM-B1-658010-BE", qty: 0 },
  ],
});
assert.deepStrictEqual(
  added.map((d) => `${d.sku}:${d.delta}`),
  ["LAT-MES:4", "CAJA-S1:2"]
);

const counted = buildStockAdjustDeltas({
  mode: "set",
  stockBySku: stock,
  lines: [
    { sku: "LAT-MES", qty: 10, label: "Lateral mesa Natural" },
    { sku: "CAJA-S1", qty: 0, label: "Caja S1" },
  ],
});
assert.deepStrictEqual(
  counted.map((d) => `${d.sku}:${d.delta}`),
  ["LAT-MES:2"]
);

const zeroBox = buildStockAdjustDeltas({
  mode: "set",
  stockBySku: new Map([["CAJA-S1", 5]]),
  lines: [{ sku: "CAJA-S1", qty: 0, label: "Caja S1" }],
});
assert.deepStrictEqual(
  zeroBox.map((d) => `${d.sku}:${d.delta}`),
  ["CAJA-S1:-5"]
);

const removed = buildStockAdjustDeltas({
  mode: "subtract",
  stockBySku: stock,
  lines: [{ sku: "LAT-MES", qty: 3, label: "Lateral mesa Natural" }],
});
assert.deepStrictEqual(
  removed.map((d) => `${d.sku}:${d.delta}`),
  ["LAT-MES:-3"]
);

assert.throws(
  () =>
    buildStockAdjustDeltas({
      mode: "subtract",
      stockBySku: stock,
      lines: [{ sku: "LAT-MES", qty: 9, label: "Lateral mesa Natural" }],
    }),
  /insuficiente/
);

assert.throws(
  () =>
    buildStockAdjustDeltas({
      mode: "add",
      stockBySku: stock,
      lines: [{ sku: "LAT-MES", qty: 0 }],
    }),
  /Marcá al menos una cantidad/
);

assert.throws(
  () =>
    buildStockAdjustDeltas({
      mode: "add",
      stockBySku: stock,
      lines: [{ sku: "NO-EXISTE", qty: 1 }],
    }),
  /no encontrado/
);

console.log("test-stock-adjust: OK");
