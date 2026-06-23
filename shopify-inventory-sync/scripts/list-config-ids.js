#!/usr/bin/env node
/**
 * Lista product IDs, componentes BOM y variantes para copiar a Vercel.
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { getAuthConfig, getInventorySyncMode } = require("../lib/config");
const { getAccessToken } = require("../lib/accessToken");
const { fetchAllProductsCatalog } = require("../lib/shopifyAdmin");
const { mesaColorFromJuegoTitle } = require("../lib/bom/parseVariant");
const { allExpectedComponentSkus } = require("../lib/bom/colors");
const {
  findComponentProducts,
  expectedSkuForVariant,
  COMPONENT_PRODUCT_RULES,
} = require("../lib/bom/componentProducts");

function matchProduct(title, keywords) {
  const lower = title.toLowerCase();
  return keywords.every((k) => lower.includes(k));
}

function findFinishedProduct(catalog, keywords) {
  return catalog.find((p) => {
    if (p.status === "DRAFT") {
      return false;
    }
    return matchProduct(p.title, keywords);
  });
}

async function main() {
  const auth = getAuthConfig();
  console.log("\n=== SHOPIFY_STORE_DOMAIN ===");
  console.log(auth.storeDomain);

  console.log("\n=== Modo de sync ===");
  console.log(`INVENTORY_SYNC_MODE=${getInventorySyncMode()}`);

  console.log("\n=== Probando acceso ===");
  await getAccessToken();
  console.log("Token OK");

  const catalog = await fetchAllProductsCatalog();

  const sillon1 = findFinishedProduct(catalog, ["sillon", "1"]);
  const sillon3 = findFinishedProduct(catalog, ["sillon", "3"]);
  const mesa = findFinishedProduct(catalog, ["mesa", "ratona"]);
  const juego = findFinishedProduct(catalog, ["juego", "living"]);
  const reposera = findFinishedProduct(catalog, ["reposera"]);

  console.log("\n=== PRODUCT_ID terminados (copiá a Vercel) ===");
  const mapping = [
    ["PRODUCT_ID_SILLON_1", sillon1, ["sillon", "1"]],
    ["PRODUCT_ID_SILLON_3", sillon3, ["sillon", "3"]],
    ["PRODUCT_ID_MESA", mesa, ["mesa", "ratona"]],
    ["PRODUCT_ID_JUEGO", juego, ["juego", "living"]],
    ["PRODUCT_ID_REPOSERA", reposera, ["reposera"]],
  ];

  for (const [envKey, product, keywords] of mapping) {
    if (product) {
      const id = product.productId;
      console.log(`${envKey}=${id}  # ${product.title} (${product.status})`);
    } else {
      console.log(`${envKey}=???  # No encontrado activo (buscar: ${keywords.join(", ")})`);
    }
  }

  const mesaComponentProductId = process.env.PRODUCT_ID_MESA_COMPONENT?.trim() || null;
  const componentMatches = findComponentProducts(catalog, { mesaComponentProductId });

  console.log("\n=== Componentes BOM (borradores) ===");
  for (const rule of COMPONENT_PRODUCT_RULES) {
    const match = componentMatches.get(rule.key);
    if (match) {
      console.log(`OK  ${rule.label} → product ${match.product.productId} (${match.product.title})`);
    } else {
      console.log(`FALTA  ${rule.label}`);
    }
  }

  if (componentMatches.get("mesa_comp")) {
    const mesaComp = componentMatches.get("mesa_comp").product;
    console.log(`\n# Opcional si hay más de una Mesa Ratona:`);
    console.log(`PRODUCT_ID_MESA_COMPONENT=${mesaComp.productId}  # ${mesaComp.title}`);
  }

  console.log("\n=== SKUs de componentes (23 esperados) ===");
  const expectedSkus = allExpectedComponentSkus();
  const foundSkus = new Map();

  for (const [, { rule, product }] of componentMatches.entries()) {
    for (const variant of product.variants) {
      const sku = expectedSkuForVariant(rule, variant);
      foundSkus.set(sku, {
        product: product.title,
        variant: variant.title,
        shopifySku: variant.sku || "(sin SKU en Shopify)",
      });
    }
  }

  let missingSkuCount = 0;
  for (const sku of expectedSkus) {
    const info = foundSkus.get(sku);
    if (info) {
      const skuNote = info.shopifySku === sku ? "" : ` shopify=${info.shopifySku}`;
      console.log(`  ${sku}  ←  ${info.product} / ${info.variant}${skuNote}`);
    } else {
      console.log(`  ${sku}  ←  FALTA`);
      missingSkuCount += 1;
    }
  }

  if (missingSkuCount > 0) {
    console.log(`\n⚠ Faltan ${missingSkuCount} SKUs/variantes. Asigná SKUs o revisá títulos de color.`);
  } else {
    console.log("\n✓ Los 23 SKUs de componentes están resueltos.");
  }

  console.log("\n=== LOCATION_ID ===");
  console.log("No hace falta: el servidor lo detecta solo desde el inventario.");
  console.log("(Opcional: Settings → Locations → número en la URL → LOCATION_ID en Vercel)");

  console.log("\n=== Variantes por producto (catálogo) ===");
  for (const p of catalog) {
    console.log(`\n  ${p.title} (product ${p.productId}, ${p.status})`);
    for (const v of p.variants) {
      const sku = v.sku ? ` sku=${v.sku}` : "";
      console.log(`    ${v.variantId}  —  ${v.title || "(default)"}${sku}`);
    }
  }

  if (juego) {
    console.log("\n=== Cómo se calcula cada Juego (modo componentes) ===");
    for (const jv of juego.variants) {
      const mesaColor = mesaColorFromJuegoTitle(jv.title);
      console.log(
        `  Juego "${jv.title}" ← min(floor(sillon1_calc/2), sillon3_calc, mesa_calc "${mesaColor}")`
      );
      console.log(`    sillon1/sillon3 se calculan desde estructuras + almohadones "${jv.title}"`);
    }
  }

  console.log("");
}

main().catch((err) => {
  console.error("\nERROR:", err.message || err);
  process.exit(1);
});
