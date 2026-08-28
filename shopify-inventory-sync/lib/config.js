const { SHOPIFY_API_VERSION } = require("./apiVersion");

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return String(value).trim();
}

function normalizeStoreDomain(domain) {
  return domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function getStoreDomain() {
  return normalizeStoreDomain(requireEnv("SHOPIFY_STORE_DOMAIN"));
}

function getAuthConfig() {
  const storeDomain = getStoreDomain();
  const staticToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim();
  const clientId = process.env.SHOPIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET?.trim();

  if (staticToken) {
    return { storeDomain, mode: "static", accessToken: staticToken };
  }

  if (clientId && clientSecret) {
    return { storeDomain, mode: "client_credentials", clientId, clientSecret };
  }

  throw new Error(
    "Missing Shopify auth: set SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET (Dev Dashboard) " +
      "or SHOPIFY_ADMIN_ACCESS_TOKEN (legacy custom app)"
  );
}

/** Config for inventory sync (webhook handler validates secret separately). */
function getSyncConfig() {
  getAuthConfig();

  const productIds = {
    sillon1: requireEnv("PRODUCT_ID_SILLON_1"),
    sillon3: requireEnv("PRODUCT_ID_SILLON_3"),
    mesa: requireEnv("PRODUCT_ID_MESA"),
    juego: requireEnv("PRODUCT_ID_JUEGO"),
  };

  const reposera = process.env.PRODUCT_ID_REPOSERA?.trim();
  if (reposera) {
    productIds.reposera = reposera;
  }

  return {
    storeDomain: getStoreDomain(),
    /** Optional — if omitted, resolved from inventory API */
    locationId: process.env.LOCATION_ID?.trim() || null,
    productIds,
    apiVersion: process.env.SHOPIFY_API_VERSION || SHOPIFY_API_VERSION,
    inventorySyncMode: getInventorySyncMode(),
  };
}

/** `components` (default) = BOM desde piezas; `legacy` = solo recalcula Juego Living */
function getInventorySyncMode() {
  const mode = (process.env.INVENTORY_SYNC_MODE || "components").trim().toLowerCase();
  if (mode !== "components" && mode !== "legacy") {
    throw new Error('INVENTORY_SYNC_MODE debe ser "components" o "legacy"');
  }
  return mode;
}

function getAlertThresholds() {
  return {
    sillon1: Number(process.env.ALERT_THRESHOLD_SILLON_1 ?? 4),
    sillon3: Number(process.env.ALERT_THRESHOLD_SILLON_3 ?? 2),
    mesa: Number(process.env.ALERT_THRESHOLD_MESA ?? 2),
    reposera: Number(process.env.ALERT_THRESHOLD_REPOSERA ?? 2),
    juego: Number(process.env.ALERT_THRESHOLD_JUEGO ?? 1),
  };
}

function getWhatsAppConfig() {
  const provider = process.env.WHATSAPP_PROVIDER?.trim().toLowerCase() || "";
  const to = process.env.WHATSAPP_TO?.trim() || "";

  if (!provider || !to) {
    return { enabled: false, provider: null, to: null };
  }

  if (provider === "twilio") {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const from = process.env.TWILIO_WHATSAPP_FROM?.trim();
    if (!accountSid || !authToken || !from) {
      return { enabled: false, provider: "twilio", to, misconfigured: true };
    }
    return { enabled: true, provider: "twilio", to, accountSid, authToken, from };
  }

  if (provider === "cloud_api") {
    const token = process.env.WHATSAPP_CLOUD_TOKEN?.trim();
    const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim();
    if (!token || !phoneNumberId) {
      return { enabled: false, provider: "cloud_api", to, misconfigured: true };
    }
    return { enabled: true, provider: "cloud_api", to, token, phoneNumberId };
  }

  return { enabled: false, provider, to, unknownProvider: true };
}

function getAdminStoreUrl() {
  return `https://${getStoreDomain()}/admin`;
}

function getShopifyPendingOrdersUrl() {
  const handle = getStoreDomain().replace(/\.myshopify\.com$/i, "");
  return `https://admin.shopify.com/store/${handle}/orders?status=open&fulfillment_status=unfulfilled`;
}

function getWebhookSecret() {
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET?.trim();
  const dedicated = process.env.SHOPIFY_WEBHOOK_SECRET?.trim();
  // Las suscripciones creadas por Admin API se firman con el client secret de la app.
  if (clientSecret) {
    return clientSecret;
  }
  if (dedicated) {
    return dedicated;
  }
  throw new Error("Missing SHOPIFY_CLIENT_SECRET or SHOPIFY_WEBHOOK_SECRET");
}

module.exports = {
  getSyncConfig,
  getAuthConfig,
  getStoreDomain,
  getWebhookSecret,
  getAlertThresholds,
  getWhatsAppConfig,
  getAdminStoreUrl,
  getShopifyPendingOrdersUrl,
  getInventorySyncMode,
};
