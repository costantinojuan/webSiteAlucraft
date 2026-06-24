const { getSyncConfig, getInventorySyncMode } = require("./config");
const { buildRefundRestocks } = require("./bom/buildRefundRestocks");
const { applyComponentRestocks } = require("./bom/applyComponentRestocks");
const { wasWebhookProcessed, markWebhookProcessed } = require("./processedWebhooks");
const { fetchOrderTags, orderHasSyncTag } = require("./orderSyncTag");
const { runInventorySync } = require("./inventorySync");
const { recordSync } = require("./syncState");
const { getDashboardStockSummary } = require("./dashboardData");
const { checkAndSendStockAlerts } = require("./alerts/stockAlerts");
const { parseOrderBody } = require("./handleOrderPaid");

function skipResult(reason, orderId, extra = {}) {
  return {
    ok: true,
    skipped: true,
    reason,
    orderId,
    ...extra,
  };
}

async function handleRefundCreate(rawBody, shop, webhookId = null) {
  const refund = parseOrderBody(rawBody);
  const refundId = refund.id;
  const orderId = refund.order_id;

  if (!orderId) {
    return skipResult("missing_order_id", null, { refundId });
  }

  if (webhookId && wasWebhookProcessed(webhookId)) {
    return skipResult("webhook_duplicate", orderId, { refundId, webhookId });
  }

  let order;
  try {
    order = await fetchOrderTags(orderId);
  } catch (error) {
    console.warn("fetchOrderTags failed (¿falta scope read_orders?):", error.message);
    return skipResult("order_fetch_failed", orderId, { refundId, error: error.message });
  }

  if (!orderHasSyncTag(order)) {
    return skipResult("order_not_synced", orderId, {
      refundId,
      orderName: order.name,
    });
  }

  const config = getSyncConfig();
  const mode = getInventorySyncMode();

  let restockItems = [];
  let restockErrors = [];
  let restocks = null;

  if (mode === "components") {
    const built = buildRefundRestocks(refund, config.productIds);
    restockItems = built.items;
    restockErrors = built.items.filter((item) => item.error);

    if (built.lines.length === 0) {
      return skipResult("no_restock_items", orderId, {
        refundId,
        orderName: order.name,
        restockItems,
      });
    }

    restocks = await applyComponentRestocks(built.lines, config);
  }

  if (webhookId) {
    markWebhookProcessed(webhookId);
  }

  const syncResult = await runInventorySync();
  recordSync(syncResult, "refund");

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
    restockItems,
    restockErrors,
    restocks,
    syncResult,
    alertResult,
  };
}

module.exports = { handleRefundCreate };
