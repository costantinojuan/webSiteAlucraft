#!/usr/bin/env node
/**
 * Devuelve componentes de un pedido manualmente (sin webhook).
 * Uso: node scripts/restock-order.js ORDER_ID
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { shopifyGraphQL } = require("../lib/shopifyAdmin");
const { orderGid } = require("../lib/gids");
const { processOrderRestock } = require("../lib/processOrderRestock");
const { collectRefundLineItems } = require("../lib/bom/normalizeRefundPayload");

const ORDER_REFUNDS_QUERY = `
  query OrderRefunds($id: ID!) {
    order(id: $id) {
      legacyResourceId
      name
      tags
      lineItems(first: 20) {
        nodes {
          title
          quantity
          variantTitle
          product { legacyResourceId title }
        }
      }
      refunds(first: 5) {
        legacyResourceId
        refundLineItems(first: 20) {
          nodes {
            quantity
            restockType
            location { legacyResourceId }
            lineItem {
              title
              quantity
              variantTitle
              product { legacyResourceId title }
            }
          }
        }
      }
    }
  }
`;

async function main() {
  const orderId = process.argv[2];
  if (!orderId) {
    console.error("Uso: node scripts/restock-order.js ORDER_ID");
    process.exit(1);
  }

  const data = await shopifyGraphQL(ORDER_REFUNDS_QUERY, { id: orderGid(orderId) });
  const order = data.order;
  if (!order) {
    throw new Error(`Pedido no encontrado: ${orderId}`);
  }

  const refundSource = {
    line_items: (order.lineItems?.nodes || []).map((li) => ({
      product_id: Number(li.product?.legacyResourceId),
      title: li.product?.title,
      variant_title: li.variantTitle,
      name: li.title,
      quantity: li.quantity,
    })),
    refunds: (order.refunds || []).map((refund) => ({
      refund_line_items: (refund.refundLineItems?.nodes || []).map((rli) => ({
        quantity: rli.quantity,
        restock_type: rli.restockType,
        location_id: rli.location?.legacyResourceId,
        line_item: {
          product_id: Number(rli.lineItem?.product?.legacyResourceId),
          title: rli.lineItem?.product?.title,
          variant_title: rli.lineItem?.variantTitle,
          name: rli.lineItem?.title,
          quantity: rli.lineItem?.quantity,
        },
      })),
    })),
  };

  console.log(`\nRestockeando ${order.name} (id ${order.legacyResourceId})`);
  console.log("Refund line items:", collectRefundLineItems(refundSource).length);

  const result = await processOrderRestock({
    orderId: Number(order.legacyResourceId),
    refundId: `manual-${Date.now()}`,
    refundSource,
    source: "manual",
    allowLineItemFallback: true,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});
