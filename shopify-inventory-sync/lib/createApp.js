const express = require("express");
const { mountAdmin, runSyncWithAlerts } = require("./adminRoutes");
const { createShopifyWebhookHandler } = require("./webhookRouter");
const { handleOrderPaid } = require("./handleOrderPaid");
const { handleRefundCreate } = require("./handleRefundCreate");
const { handleOrderCancelled } = require("./handleOrderCancelled");

const shopifyWebhookHandler = createShopifyWebhookHandler({
  "orders/paid": handleOrderPaid,
  "refunds/create": handleRefundCreate,
  "orders/cancelled": handleOrderCancelled,
});

function createApp() {
  const app = express();

  // Vercel termina HTTPS delante del proxy; necesario para cookies secure
  app.set("trust proxy", 1);

  mountAdmin(app);

  app.get("/", (req, res) => {
    // Shopify redirige acá al instalar (hmac, host en query)
    if (req.query.host || req.query.hmac) {
      return res.status(200).type("html").send(`<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>Alucraft Inventory Sync</title>
<link rel="icon" href="/admin/static/alucraft-logo.png" type="image/png"></head>
<body style="font-family:system-ui;max-width:32rem;margin:3rem auto;padding:0 1rem">
  <h1>App conectada</h1>
  <p>Al pagarse un pedido, la app descuenta <strong>componentes</strong> y recalcula stock en la tienda (webhook <code>orders/paid</code>).</p>
  <p>Al cancelar o reembolsar con <strong>restock</strong>, devuelve componentes y recalcula (webhooks <code>refunds/create</code> y <code>orders/cancelled</code>).</p>
  <p>Panel admin: <a href="/admin">/admin</a></p>
  <p>Copiá el <strong>Admin API access token</strong> en el Partner Dashboard → esta app → API credentials → y pegalo en Vercel como <code>SHOPIFY_ADMIN_ACCESS_TOKEN</code>.</p>
  <p>Podés cerrar esta pestaña.</p>
</body></html>`);
    }

    res.json({
      ok: true,
      service: "shopify-inventory-sync",
      webhooks: {
        ordersPaid: "POST /webhooks/orders-paid",
        refundsCreate: "POST /webhooks/refunds-create",
      },
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
    shopifyWebhookHandler
  );

  app.post(
    "/webhooks/refunds-create",
    express.raw({ type: "application/json" }),
    shopifyWebhookHandler
  );

  app.use(express.json());

  return app;
}

module.exports = { createApp };
