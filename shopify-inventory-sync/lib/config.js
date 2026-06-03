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

  return {
    storeDomain: getStoreDomain(),
    /** Optional — if omitted, resolved from inventory API */
    locationId: process.env.LOCATION_ID?.trim() || null,
    productIds: {
      sillon1: requireEnv("PRODUCT_ID_SILLON_1"),
      sillon3: requireEnv("PRODUCT_ID_SILLON_3"),
      mesa: requireEnv("PRODUCT_ID_MESA"),
      juego: requireEnv("PRODUCT_ID_JUEGO"),
    },
    apiVersion: process.env.SHOPIFY_API_VERSION || SHOPIFY_API_VERSION,
  };
}

function getWebhookSecret() {
  return requireEnv("SHOPIFY_WEBHOOK_SECRET");
}

module.exports = {
  getSyncConfig,
  getAuthConfig,
  getStoreDomain,
  getWebhookSecret,
};
