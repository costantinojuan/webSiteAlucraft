const { getSyncConfig, getInventorySyncMode } = require("./config");
const { buildOrderDeductions } = require("./bom/buildOrderDeductions");
const { applyComponentDeductions } = require("./bom/applyComponentDeductions");
const { wasOrderProcessed, markOrderProcessed } = require("./processedOrders");
const { runInventorySync } = require("./inventorySync");
const { recordSync } = require("./syncState");
const { getDashboardStockSummary } = require("./dashboardData");
const { checkAndSendStockAlerts } = require("./alerts/stockAlerts");

function parseOrderBody(rawBody) {
  const text = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody);
  return JSON.parse(text);
}

async function handleOrderPaid(rawBody, shop) {
  const order = parseOrderBody(rawBody);
  const orderId = order.id;
  const orderName = order.name || `#${orderId}`;

  if (wasOrderProcessed(shop, orderId)) {
    return {
      ok: true,
      skipped: true,
      reason: "already_processed",
      orderId,
      orderName,
    };
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

  markOrderProcessed(shop, orderId);

  return {
    ok: true,
    skipped: false,
    orderId,
    orderName,
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
