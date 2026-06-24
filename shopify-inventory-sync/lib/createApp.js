const express = require("express");
const { getWebhookSecret } = require("./config");
const { verifyShopifyWebhook } = require("./verifyWebhook");
const { mountAdmin, runSyncWithAlerts } = require("./adminRoutes");

function createApp() {
  const app = express();

  // Vercel termina HTTPS delante del proxy; necesario para cookies secure
  app.set("trust proxy", 1);

  mountAdmin(app);

  app.get("/", (req, res) => {
    // Shopify redirige acá al instalar (hmac, host en query)
    if (req.query.host || req.query.hmac) {
      return res.status(200).type("html").send(`<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>Alucraft Inventory Sync</title></head>
<body style="font-family:system-ui;max-width:32rem;margin:3rem auto;padding:0 1rem">
  <h1>App conectada</h1>
  <p>Al pagarse un pedido, la app descuenta <strong>componentes</strong> y recalcula stock en la tienda (webhook <code>orders/paid</code>).</p>
  <p>Panel admin: <a href="/admin">/admin</a></p>
  <p>Copiá el <strong>Admin API access token</strong> en el Partner Dashboard → esta app → API credentials → y pegalo en Vercel como <code>SHOPIFY_ADMIN_ACCESS_TOKEN</code>.</p>
  <p>Podés cerrar esta pestaña.</p>
</body></html>`);
    }

    res.json({
      ok: true,
      service: "shopify-inventory-sync",
      webhook: "POST /webhooks/orders-paid",
      admin: "/admin",
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
        const webhookSecret = getWebhookSecret();
        const hmac = req.get("X-Shopify-Hmac-Sha256");
        const topic = req.get("X-Shopify-Topic");
        const shop = req.get("X-Shopify-Shop-Domain");

        if (!verifyShopifyWebhook(req.body, hmac, webhookSecret)) {
          console.warn("Invalid webhook HMAC", { shop, topic });
          return res.status(401).send("Unauthorized");
        }

        if (topic && topic !== "orders/paid") {
          console.warn("Unexpected webhook topic", { topic, shop });
        }

        const webhookId = req.get("X-Shopify-Webhook-Id");
        const { handleOrderPaid } = require("./handleOrderPaid");
        const result = await handleOrderPaid(req.body, shop, webhookId);

        console.log("Order paid processed", {
          shop,
          topic,
          webhookId,
          orderId: result.orderId,
          orderName: result.orderName,
          skipped: result.skipped,
          skipReason: result.reason,
          deductions: result.deductions?.length ?? 0,
          errors: result.deductionErrors?.length ?? 0,
        });

        return res.status(200).json(result);
      } catch (error) {
        console.error("Webhook handler error", error);
        return res.status(500).json({
          ok: false,
          error: error.message,
        });
      }
    }
  );

  app.use(express.json());

  return app;
}

module.exports = { createApp };
