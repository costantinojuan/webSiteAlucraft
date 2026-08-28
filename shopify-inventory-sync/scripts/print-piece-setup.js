#!/usr/bin/env node
/**
 * Checklist para crear los productos borrador de piezas en Shopify.
 * Uso: node scripts/print-piece-setup.js
 */

const { PIECES, skuForPieceVariant } = require("../lib/bom/pieces");

const VARIANTS = [
  "Natural",
  "Pintura NM",
  "Pintura AR",
  "Negro Microtexturado",
  "Arena",
];

console.log(`
=== Piezas de estructura (Shopify Admin) ===

Creá ${PIECES.length} productos en BORRADOR, no publicados (no Active, no Online Store).
Opción de variante: un solo valor, por ejemplo "Estado".
Misma ubicación de inventario que el resto de componentes.

Títulos EXACTOS (la app los busca así):
`);

for (const piece of PIECES) {
  console.log(`  • ${piece.shopifyTitle}`);
}

console.log(`
Variantes de CADA producto (título → SKU):
`);

for (const piece of PIECES) {
  console.log(`${piece.shopifyTitle}`);
  for (const title of VARIANTS) {
    console.log(`  ${title.padEnd(22)}  ${skuForPieceVariant(piece.key, title)}`);
  }
  console.log("");
}

console.log(`Cuando estén creados:
  1. npm run list-ids   (tiene que decir OK en las piezas y 0 SKUs faltantes)
  2. Recién ahí deploy a Vercel de shopify-inventory-sync

Los borradores viejos de Estructura / Mesa componente pueden quedar:
la app ya no los usa. Las ventas descuentan solo piezas PINTADAS.
`);
