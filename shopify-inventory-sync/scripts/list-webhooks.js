#!/usr/bin/env node
/**
 * Lista webhooks visibles para esta app (GraphQL + REST).
 * No imprime secretos. Las notificaciones de Settings → Notifications
 * que no pertenezcan a esta app pueden no aparecer acá.
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { shopifyGraphQL } = require("../lib/shopifyAdmin");
const { getStoreDomain } = require("../lib/config");
const { getAccessToken } = require("../lib/accessToken");
const { SHOPIFY_API_VERSION } = require("../lib/apiVersion");

const EXPECTED = [
  { topicGraphql: "ORDERS_PAID", path: "/webhooks/orders-paid" },
  { topicGraphql: "REFUNDS_CREATE", path: "/webhooks/refunds-create" },
  { topicGraphql: "ORDERS_CANCELLED", path: "/webhooks/orders-cancelled" },
];

function callbackUrl(node) {
  return node?.endpoint?.callbackUrl || node?.uri || null;
}

async function listGraphql() {
  const data = await shopifyGraphQL(`{
    webhookSubscriptions(first: 50) {
      nodes {
        id
        topic
        createdAt
        endpoint {
          __typename
          ... on WebhookHttpEndpoint { callbackUrl }
        }
      }
    }
  }`);
  return data.webhookSubscriptions?.nodes || [];
}

async function listRest() {
  const domain = getStoreDomain();
  const token = await getAccessToken();
  const version = process.env.SHOPIFY_API_VERSION || SHOPIFY_API_VERSION;
  const res = await fetch(`https://${domain}/admin/api/${version}/webhooks.json`, {
    headers: { "X-Shopify-Access-Token": token },
  });
  const payload = await res.json();
  if (!res.ok) {
    throw new Error(`REST webhooks.json HTTP ${res.status}: ${JSON.stringify(payload)}`);
  }
  return payload.webhooks || [];
}

function printGap(nodes) {
  const topics = new Set(nodes.map((n) => String(n.topic || "").toUpperCase().replace(/-/g, "_")));
  console.log("\n=== Esperados por esta app ===");
  for (const expected of EXPECTED) {
    const ok = [...topics].some(
      (t) => t === expected.topicGraphql || t === expected.topicGraphql.replace(/_/g, "/")
    );
    console.log(`  ${ok ? "OK " : "FALTA"}  ${expected.topicGraphql}  →  ${expected.path}`);
  }
}

async function main() {
  console.log("=== Webhooks de la app Shopify ===");
  console.log("tienda:", getStoreDomain());

  const nodes = await listGraphql();
  console.log("\nGraphQL webhookSubscriptions:", nodes.length);
  for (const n of nodes) {
    console.log(" ", n.topic, callbackUrl(n) || n.endpoint?.__typename, n.createdAt || "");
  }

  const rest = await listRest();
  console.log("\nREST webhooks.json:", rest.length);
  for (const h of rest) {
    console.log(" ", h.topic, h.address, h.created_at);
  }

  printGap(nodes);

  if (nodes.length === 0 && rest.length === 0) {
    console.log("\nC1: esta app no tiene webhooks. Un pedido pagado NO descuenta BOM.");
    console.log("Cuando Vercel responda GET /health → {\"ok\":true}, corré:");
    console.log("  npm run register-webhooks -- --url https://TU-PROYECTO.vercel.app");
    console.log("y después --apply si el dry-run está bien.");
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});
