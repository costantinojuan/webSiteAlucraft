const express = require("express");
const { getConfig } = require("./config");
const { verifyShopifyWebhook } = require("./verifyWebhook");
const { syncJuegoLivingStock } = require("./syncJuegoStock");

function createApp() {
  const app = express();

  app.get("/", (req, res) => {
    // Shopify redirige acá al instalar (hmac, host en query)
    if (req.query.host || req.query.hmac) {
      return res.status(200).type("html").send(`<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>Alucraft Inventory Sync</title></head>
<body style="font-family:system-ui;max-width:32rem;margin:3rem auto;padding:0 1rem">
  <h1>App conectada</h1>
  <p>El servidor está activo. El stock del <strong>Juego Living</strong> se sincroniza con el webhook <code>orders/paid</code>.</p>
  <p>Copiá el <strong>Admin API access token</strong> en el Partner Dashboard → esta app → API credentials → y pegalo en Vercel como <code>SHOPIFY_ADMIN_ACCESS_TOKEN</code>.</p>
  <p>Podés cerrar esta pestaña.</p>
</body></html>`);
    }

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
