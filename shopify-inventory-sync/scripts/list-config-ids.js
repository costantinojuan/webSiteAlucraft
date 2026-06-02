#!/usr/bin/env node
/**
 * Lista ubicaciones y variantes para copiar a Vercel.
 * Uso (desde shopify-inventory-sync/):
 *   SHOPIFY_STORE_DOMAIN=tu-tienda.myshopify.com \
 *   SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_... \
 *   node scripts/list-config-ids.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const store = process.env.SHOPIFY_STORE_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "");
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const version = process.env.SHOPIFY_API_VERSION || "2025-04";

if (!store || !token) {
  console.error("Faltan SHOPIFY_STORE_DOMAIN y SHOPIFY_ADMIN_ACCESS_TOKEN en .env o en el entorno.");
  process.exit(1);
}

async function gql(query, variables = {}) {
  const res = await fetch(`https://${store}/admin/api/${version}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  return json.data;
}

async function main() {
  console.log("\n=== SHOPIFY_STORE_DOMAIN ===");
  console.log(store);

  const locData = await gql(`{
    locations(first: 20) {
      nodes { id name isActive isPrimary }
    }
  }`);

  console.log("\n=== LOCATION_ID (elegí la ubicación donde está el inventario) ===");
  for (const loc of locData.locations.nodes) {
    const numeric = loc.id.split("/").pop();
    const tag = loc.isPrimary ? " [PRIMARY]" : "";
    console.log(`  ${numeric}  —  ${loc.name}${tag}  (gid: ${loc.id})`);
  }

  const prodData = await gql(`{
    products(first: 50) {
      nodes {
        title
        variants(first: 20) {
          nodes { id title sku inventoryQuantity }
        }
      }
    }
  }`);

  console.log("\n=== VARIANT_ID (copiá el número a Vercel) ===");
  for (const p of prodData.products.nodes) {
    console.log(`\n  Producto: ${p.title}`);
    for (const v of p.variants.nodes) {
      const numeric = v.id.split("/").pop();
      const sku = v.sku ? ` sku=${v.sku}` : "";
      const qty = v.inventoryQuantity != null ? ` stock≈${v.inventoryQuantity}` : "";
      console.log(`    ${numeric}  —  ${v.title || "(default)"}${sku}${qty}`);
    }
  }

  console.log("\n=== Mapeo sugerido para Vercel ===");
  console.log("VARIANT_ID_SILLON_1  → Sillón 1 Cuerpo");
  console.log("VARIANT_ID_SILLON_3  → Sillón 3 Cuerpos");
  console.log("VARIANT_ID_MESA      → Mesa Ratona");
  console.log("VARIANT_ID_JUEGO     → Juego Living Exterior");
  console.log("");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
