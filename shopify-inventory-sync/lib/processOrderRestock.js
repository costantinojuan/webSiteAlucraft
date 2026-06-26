const { getSyncConfig, getInventorySyncMode } = require("./config");
const { buildRefundRestocks } = require("./bom/buildRefundRestocks");
const { buildOrderDeductions } = require("./bom/buildOrderDeductions");
const { applyComponentRestocks } = require("./bom/applyComponentRestocks");
const {
  fetchOrderTags,
  orderHasSyncTag,
  orderHasRestockTag,
  markOrderInventoryRestocked,
} = require("./orderSyncTag");
const { runInventorySync } = require("./inventorySync");
const { recordSync } = require("./syncState");
const { getDashboardStockSummary } = require("./dashboardData");
const { checkAndSendStockAlerts } = require("./alerts/stockAlerts");
const { collectRefundLineItems } = require("./bom/normalizeRefundPayload");

function skipResult(reason, orderId, extra = {}) {
  return {
    ok: true,
    skipped: true,
    reason,
    orderId,
    ...extra,
  };
}

async function processOrderRestock({
  orderId,
  refundId = null,
  refundSource,
  webhookId = null,
  source = "refund",
  allowLineItemFallback = false,
}) {
  if (!orderId) {
    return skipResult("missing_order_id", null, { refundId });
  }

  let order;
  try {
    order = await fetchOrderTags(orderId);
  } catch (error) {
    console.warn("fetchOrderTags failed:", error.message);
    return skipResult("order_fetch_failed", orderId, { refundId, error: error.message });
  }

  if (orderHasRestockTag(order)) {
    return skipResult("already_restocked", orderId, {
      refundId,
      orderName: order.name,
    });
  }

  const config = getSyncConfig();
  const mode = getInventorySyncMode();

  let built = { lines: [], items: [] };

  if (mode === "components") {
    built = buildRefundRestocks(refundSource, config.productIds);

    if (built.lines.length === 0 && allowLineItemFallback && refundSource.line_items?.length) {
      console.warn("Refund sin líneas restockeables — fallback a line_items del pedido", {
        orderId,
        orderName: order.name,
      });
      built = buildOrderDeductions(refundSource, config.productIds);
    }
  }

  if (!orderHasSyncTag(order)) {
    if (built.lines.length === 0) {
      return skipResult("order_not_synced", orderId, {
        refundId,
        orderName: order.name,
      });
    }
    console.warn("Restock sin tag alucraft-inventory-synced", {
      orderId,
      orderName: order.name,
    });
  }

  if (built.lines.length === 0) {
    return skipResult("no_restock_items", orderId, {
      refundId,
      orderName: order.name,
      restockItems: built.items,
      refundLineItemCount: collectRefundLineItems(refundSource).length,
    });
  }

  const restockErrors = built.items.filter((item) => item.error);
  const restocks = await applyComponentRestocks(built.lines, config);

  try {
    await markOrderInventoryRestocked(orderId);
  } catch (error) {
    console.warn("Restock tag failed:", error.message);
  }

  const syncResult = await runInventorySync();
  recordSync(syncResult, source);

  const stock = await getDashboardStockSummary();
  const alertResult = await checkAndSendStockAlerts(stock.products);

  return {
    ok: true,
    skipped: false,
    refundId,
    orderId,
    orderName: order.name,
    webhookId,
    mode,
    restockItems: built.items,
    restockErrors,
    restocks,
    syncResult,
    alertResult,
  };
}

module.exports = { processOrderRestock, skipResult };
