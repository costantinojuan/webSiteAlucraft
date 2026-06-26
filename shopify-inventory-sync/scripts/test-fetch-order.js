#!/usr/bin/env node
/** Prueba lectura de pedido por GraphQL (read_orders). Uso: node scripts/test-fetch-order.js [orderId] */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { fetchOrderTags } = require("../lib/orderSyncTag");
const { shopifyGraphQL } = require("../lib/shopifyAdmin");

const RECENT_ORDERS = `
  query RecentOrders {
    orders(first: 3, sortKey: CREATED_AT, reverse: true) {
      nodes { id legacyResourceId name tags displayFinancialStatus cancelReason }
    }
  }
`;

async function main() {
  const orderIdArg = process.argv[2];

  console.log("\n=== Probando acceso a pedidos ===\n");

  try {
    const data = await shopifyGraphQL(RECENT_ORDERS);
    const orders = data.orders?.nodes || [];
    console.log("Últimos pedidos:");
    for (const o of orders) {
      console.log(`  ${o.name} (id ${o.legacyResourceId}) tags: ${(o.tags || []).join(", ") || "(ninguno)"} status: ${o.displayFinancialStatus}`);
    }

    const orderId = orderIdArg || orders[0]?.legacyResourceId;
    if (!orderId) {
      console.log("\nNo hay pedidos para probar.");
      return;
    }

    console.log(`\nfetchOrderTags(${orderId}):`);
    const order = await fetchOrderTags(orderId);
    console.log(JSON.stringify(order, null, 2));
  } catch (error) {
    console.error("ERROR:", error.message);
    process.exit(1);
  }
}

main();
