require("dotenv").config({ path: ".env" });

const { createApp } = require("./lib/createApp");

const app = createApp();
const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Shopify inventory sync listening on http://localhost:${port}`);
  console.log(`Admin panel: http://localhost:${port}/admin`);
  console.log(`Webhook URL: http://localhost:${port}/webhooks/orders-paid`);
});
