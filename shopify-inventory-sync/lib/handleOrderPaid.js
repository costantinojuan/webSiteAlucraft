const { getSyncConfig, getInventorySyncMode } = require("./config");
const { buildOrderDeductions } = require("./bom/buildOrderDeductions");
const { applyComponentDeductions } = require("./bom/applyComponentDeductions");
const { wasOrderProcessed, markOrderProcessed } = require("./processedOrders");
const { wasWebhookProcessed, markWebhookProcessed } = require("./processedWebhooks");
const { orderHasSyncTag, markOrderInventorySynced } = require("./orderSyncTag");
const { runInventorySync } = require("./inventorySync");
const { recordSync } = require("./syncState");
const { getDashboardStockSummary } = require("./dashboardData");
const { checkAndSendStockAlerts } = require("./alerts/stockAlerts");

function parseOrderBody(rawBody) {
  const text = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody);
  return JSON.parse(text);
}

function skipResult(reason, orderId, orderName, extra = {}) {
  return {
    ok: true,
    skipped: true,
    reason,
    orderId,
    orderName,
    ...extra,
  };
}

async function claimOrderForProcessing(order, shop, webhookId) {
  if (orderHasSyncTag(order)) {
    return skipResult("order_tagged", order.id, order.name, { webhookId });
  }

  if (webhookId && wasWebhookProcessed(webhookId)) {
    return skipResult("webhook_duplicate", order.id, order.name, { webhookId });
  }

  if (wasOrderProcessed(shop, order.id)) {
    return skipResult("already_processed", order.id, order.name, { webhookId });
  }

  try {
    await markOrderInventorySynced(order.id);
  } catch (error) {
    console.warn("Order tag failed (¿falta scope write_orders?):", error.message);
    if (orderHasSyncTag(order)) {
      return skipResult("order_tagged", order.id, order.name, { webhookId });
    }
  }

  if (webhookId) {
    markWebhookProcessed(webhookId);
  }
  markOrderProcessed(shop, order.id);

  return null;
}

async function handleOrderPaid(rawBody, shop, webhookId = null) {
  const order = parseOrderBody(rawBody);
  const orderId = order.id;
  const orderName = order.name || `#${orderId}`;

  const skipped = await claimOrderForProcessing(order, shop, webhookId);
  if (skipped) {
    return skipped;
  }

  const config = getSyncConfig();
  const mode = getInventorySyncMode();

  let deductions = null;
  let deductionItems = [];
  let deductionErrors = [];

  if (mode === "components") {
    const built = buildOrderDeductions(order, config.productIds);
    deductionItems = built.items;
    deductionErrors = built.items.filter((i) => i.error);

    if (built.lines.length > 0) {
      deductions = await applyComponentDeductions(built.lines, config);
    }
  }

  const syncResult = await runInventorySync();
  recordSync(syncResult, "webhook");

  const stock = await getDashboardStockSummary();
  const alertResult = await checkAndSendStockAlerts(stock.products);

  return {
    ok: true,
    skipped: false,
    orderId,
    orderName,
    webhookId,
    mode,
    lineItemCount: (order.line_items || []).length,
    deductionItems,
    deductionErrors,
    deductions,
    syncResult,
    alertResult,
  };
}

module.exports = { handleOrderPaid, parseOrderBody };
