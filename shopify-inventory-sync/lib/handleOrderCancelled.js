const { wasWebhookProcessed, markWebhookProcessed } = require("./processedWebhooks");
const { parseOrderBody } = require("./handleOrderPaid");
const { processOrderRestock, skipResult } = require("./processOrderRestock");
const { collectRefundLineItems } = require("./bom/normalizeRefundPayload");

async function handleOrderCancelled(rawBody, shop, webhookId = null) {
  const order = parseOrderBody(rawBody);
  const orderId = order.id;

  if (webhookId && wasWebhookProcessed(webhookId)) {
    return skipResult("webhook_duplicate", orderId, { webhookId });
  }

  const refundLineItems = collectRefundLineItems(order);
  const hasRefundLines = refundLineItems.length > 0;

  const result = await processOrderRestock({
    orderId,
    refundId: hasRefundLines ? `cancel-${orderId}` : null,
    refundSource: hasRefundLines ? { refund_line_items: refundLineItems } : order,
    webhookId,
    source: "cancel",
    allowLineItemFallback: !hasRefundLines,
  });

  if (webhookId) {
    markWebhookProcessed(webhookId);
  }

  return result;
}

module.exports = { handleOrderCancelled };
