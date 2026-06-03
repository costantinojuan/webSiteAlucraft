#!/usr/bin/env node
/**
 * Lista product IDs y variantes para copiar a Vercel.
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { getAuthConfig } = require("../lib/config");
const { getAccessToken } = require("../lib/accessToken");
const { SHOPIFY_API_VERSION } = require("../lib/apiVersion");
const { readJsonResponse } = require("../lib/httpJson");
const { parseNumericId } = require("../lib/gids");
const { mesaColorFromJuegoTitle } = require("../lib/syncJuegoStock");

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
  const json = await readJsonResponse(res, "GraphQL Admin API");
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  return json.data;
}

function matchProduct(title, keywords) {
  const lower = title.toLowerCase();
  return keywords.every((k) => lower.includes(k));
}

async function main() {
  const auth = getAuthConfig();
  console.log("\n=== SHOPIFY_STORE_DOMAIN ===");
  console.log(auth.storeDomain);

  console.log("\n=== Probando acceso ===");
  await getAccessToken();
  console.log("Token OK");

  const prodData = await gql(`{
    products(first: 50) {
      nodes {
        id
        title
        variants(first: 100) {
          nodes { id title sku inventoryQuantity }
        }
      }
    }
  }`);

  const catalog = prodData.products.nodes;

  const find = (keywords) =>
    catalog.find((p) => matchProduct(p.title, keywords));

  const sillon1 = find(["sillon", "1"]);
  const sillon3 = find(["sillon", "3"]);
  const mesa = find(["mesa", "ratona"]);
  const juego = find(["juego", "living"]);
  const reposera = find(["reposera"]);

  console.log("\n=== PRODUCT_ID (copiá a Vercel) ===");
  const mapping = [
    ["PRODUCT_ID_SILLON_1", sillon1, ["sillon", "1"]],
    ["PRODUCT_ID_SILLON_3", sillon3, ["sillon", "3"]],
    ["PRODUCT_ID_MESA", mesa, ["mesa"]],
    ["PRODUCT_ID_JUEGO", juego, ["juego", "living"]],
    ["PRODUCT_ID_REPOSERA", reposera, ["reposera"]],
  ];

  for (const [envKey, product, keywords] of mapping) {
    if (product) {
      const id = parseNumericId(product.id);
      console.log(`${envKey}=${id}  # ${product.title}`);
    } else {
      console.log(`${envKey}=???  # No encontrado (buscar: ${keywords.join(", ")})`);
    }
  }

  console.log("\n=== LOCATION_ID ===");
  console.log("No hace falta: el servidor lo detecta solo desde el inventario.");
  console.log("(Opcional: Settings → Locations → número en la URL → LOCATION_ID en Vercel)");

  console.log("\n=== Variantes por producto ===");
  for (const p of catalog) {
    console.log(`\n  ${p.title} (product ${parseNumericId(p.id)})`);
    for (const v of p.variants.nodes) {
      const numeric = parseNumericId(v.id);
      const sku = v.sku ? ` sku=${v.sku}` : "";
      const qty = v.inventoryQuantity != null ? ` stock≈${v.inventoryQuantity}` : "";
      console.log(`    ${numeric}  —  ${v.title || "(default)"}${sku}${qty}`);
    }
  }

  if (juego) {
    console.log("\n=== Cómo se sincroniza cada Juego (por color) ===");
    for (const jv of juego.variants.nodes) {
      const mesaColor = mesaColorFromJuegoTitle(jv.title);
      console.log(
        `  Juego "${jv.title}" ← Sillón1/3 "${jv.title}" + Mesa "${mesaColor}" → min(floor(s1/2), s3, mesa)`
      );
    }
  }

  console.log("");
}

main().catch((err) => {
  console.error("\nERROR:", err.message || err);
  process.exit(1);
});
