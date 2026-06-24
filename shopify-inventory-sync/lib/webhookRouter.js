const { verifyShopifyWebhook } = require("./verifyWebhook");
const { getWebhookSecret } = require("./config");

function createShopifyWebhookHandler(handlers) {
  return async (req, res) => {
    try {
      const webhookSecret = getWebhookSecret();
      const hmac = req.get("X-Shopify-Hmac-Sha256");
      const topic = req.get("X-Shopify-Topic");
      const shop = req.get("X-Shopify-Shop-Domain");
      const webhookId = req.get("X-Shopify-Webhook-Id");

      if (!verifyShopifyWebhook(req.body, hmac, webhookSecret)) {
        console.warn("Invalid webhook HMAC", { shop, topic });
        return res.status(401).send("Unauthorized");
      }

      const handler = handlers[topic];
      if (!handler) {
        console.warn("Unhandled webhook topic", { topic, shop });
        return res.status(200).json({ ok: true, ignored: true, topic });
      }

      const result = await handler(req.body, shop, webhookId);

      console.log("Webhook processed", {
        shop,
        topic,
        webhookId,
        skipped: result.skipped,
        skipReason: result.reason,
        orderId: result.orderId,
        refundId: result.refundId,
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error("Webhook handler error", error);
      return res.status(500).json({
        ok: false,
        error: error.message,
      });
    }
  };
}

module.exports = { createShopifyWebhookHandler };
