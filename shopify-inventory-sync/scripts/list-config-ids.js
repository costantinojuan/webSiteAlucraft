#!/usr/bin/env node
/**
 * Lista ubicaciones y variantes para copiar a Vercel.
 * Uso (desde shopify-inventory-sync/):
 *   SHOPIFY_STORE_DOMAIN=tu-tienda.myshopify.com \
 *   SHOPIFY_CLIENT_ID=... SHOPIFY_CLIENT_SECRET=... \
 *   node scripts/list-config-ids.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { getAuthConfig } = require("../lib/config");
const { getAccessToken } = require("../lib/accessToken");
const { SHOPIFY_API_VERSION } = require("../lib/apiVersion");

async function gql(query, variables = {}) {
  const auth = getAuthConfig();
  const token = await getAccessToken();
  const res = await fetch(
    `https://${auth.storeDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
    }
  );
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  return json.data;
}

async function main() {
  const auth = getAuthConfig();
  console.log("\n=== SHOPIFY_STORE_DOMAIN ===");
  console.log(auth.storeDomain);

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
