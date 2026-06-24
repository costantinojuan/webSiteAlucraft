#!/usr/bin/env node
/**
 * Simula devolución de componentes por cancelación/reembolso (sin tocar Shopify).
 * Uso: node scripts/test-refund-restock.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { getSyncConfig } = require("../lib/config");
const { buildRefundRestocks } = require("../lib/bom/buildRefundRestocks");

const config = getSyncConfig();

const sampleRefund = {
  id: 888001,
  order_id: 999001,
  refund_line_items: [
    {
      quantity: 1,
      restock_type: "cancel",
      line_item: {
        product_id: Number(config.productIds.juego),
        variant_id: 1,
        title: "Juego living exterior",
        variant_title: "Marrón / Beige",
        quantity: 1,
      },
    },
    {
      quantity: 1,
      restock_type: "no_restock",
      line_item: {
        product_id: Number(config.productIds.sillon1),
        variant_id: 2,
        title: "Sillon 1 Cuerpo",
        variant_title: "Negro Microtexturado / Gris Claro",
        quantity: 1,
      },
    },
  ],
};

const result = buildRefundRestocks(sampleRefund, config.productIds);

console.log("\n=== Ítems con restock ===");
for (const item of result.items) {
  if (item.error) {
    console.log(`✗ ${item.productTitle}: ${item.error}`);
    continue;
  }
  console.log(
    `\n${item.productTitle} — ${item.variantTitle} × ${item.quantity} (${item.restockType})`
  );
  for (const component of item.components) {
    console.log(`  + ${component.qty}× ${component.sku} (${component.label})`);
  }
}

console.log("\n=== Total a devolver (por SKU) ===");
for (const line of result.lines) {
  console.log(`  +${line.qty}× ${line.sku}`);
}

console.log("");
