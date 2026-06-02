const express = require("express");
const { getConfig } = require("./config");
const { verifyShopifyWebhook } = require("./verifyWebhook");
const { syncJuegoLivingStock } = require("./syncJuegoStock");

function createApp() {
  const app = express();

  app.get("/", (_req, res) => {
    res.json({
      ok: true,
      service: "shopify-inventory-sync",
      webhook: "POST /webhooks/orders-paid",
    });
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  // Raw body required for Shopify HMAC verification
  app.post(
    "/webhooks/orders-paid",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      try {
        const config = getConfig();
        const hmac = req.get("X-Shopify-Hmac-Sha256");
        const topic = req.get("X-Shopify-Topic");
        const shop = req.get("X-Shopify-Shop-Domain");

        if (!verifyShopifyWebhook(req.body, hmac, config.webhookSecret)) {
          console.warn("Invalid webhook HMAC", { shop, topic });
          return res.status(401).send("Unauthorized");
        }

        if (topic && topic !== "orders/paid") {
          console.warn("Unexpected webhook topic", { topic, shop });
        }

        // No inspeccionamos line_items de la orden: cualquier venta pagada
        // dispara un recálculo completo del Juego desde el inventario actual.
        const result = await syncJuegoLivingStock();

        console.log("Juego Living stock synced", {
          shop,
          topic,
          result,
        });

        return res.status(200).json({
          ok: true,
          synced: result,
        });
      } catch (error) {
        console.error("Webhook handler error", error);
        return res.status(500).json({
          ok: false,
          error: error.message,
        });
      }
    }
  );

  // JSON parser for any future routes (after webhook route)
  app.use(express.json());

  return app;
}

module.exports = { createApp };
