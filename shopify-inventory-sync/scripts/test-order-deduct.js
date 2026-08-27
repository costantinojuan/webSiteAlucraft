#!/usr/bin/env node
/**
 * Simula deducciones BOM sin tocar Shopify.
 * Uso: node scripts/test-order-deduct.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { getSyncConfig } = require("../lib/config");
const { buildOrderDeductions } = require("../lib/bom/buildOrderDeductions");

const config = getSyncConfig();

const sampleOrder = {
  id: 999001,
  name: "#TEST-001",
  line_items: [
    {
      product_id: Number(config.productIds.juego),
      variant_id: 1,
      title: "Juego living exterior",
      variant_title: "Arena / Beige / Recto",
      quantity: 1,
    },
    {
      product_id: Number(config.productIds.sillon1),
      variant_id: 2,
      title: "Sillon 1 Cuerpo",
      variant_title: "Negro Microtexturado / Gris Claro / Inclinado",
      quantity: 1,
    },
  ],
};

const result = buildOrderDeductions(sampleOrder, config.productIds);

console.log("\n=== Ítems del pedido ===");
for (const item of result.items) {
  if (item.error) {
    console.log(`✗ ${item.productTitle}: ${item.error}`);
    continue;
  }
  console.log(`\n${item.productTitle} — ${item.variantTitle} × ${item.quantity}`);
  for (const c of item.components) {
    console.log(`  - ${c.qty}× ${c.sku} (${c.label})`);
  }
}

console.log("\n=== Total a descontar (por SKU) ===");
for (const line of result.lines) {
  console.log(`  ${line.qty}× ${line.sku}`);
}

console.log("");
