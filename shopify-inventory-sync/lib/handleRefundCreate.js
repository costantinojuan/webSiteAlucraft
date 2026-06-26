const { wasWebhookProcessed, markWebhookProcessed } = require("./processedWebhooks");
const { parseOrderBody } = require("./handleOrderPaid");
const { processOrderRestock, skipResult } = require("./processOrderRestock");

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

  const result = await processOrderRestock({
    orderId,
    refundId,
    refundSource: refund,
    webhookId,
    source: "refund",
    allowLineItemFallback: false,
  });

  if (webhookId) {
    markWebhookProcessed(webhookId);
  }

  return result;
}

module.exports = { handleRefundCreate };
