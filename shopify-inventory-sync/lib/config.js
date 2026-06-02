const { SHOPIFY_API_VERSION } = require("./apiVersion");

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return String(value).trim();
}

function getConfig() {
  const storeDomain = requireEnv("SHOPIFY_STORE_DOMAIN").replace(/^https?:\/\//, "").replace(/\/$/, "");

  return {
    storeDomain,
    adminAccessToken: requireEnv("SHOPIFY_ADMIN_ACCESS_TOKEN"),
    webhookSecret: requireEnv("SHOPIFY_WEBHOOK_SECRET"),
    locationId: requireEnv("LOCATION_ID"),
    variantIds: {
      sillon1: requireEnv("VARIANT_ID_SILLON_1"),
      sillon3: requireEnv("VARIANT_ID_SILLON_3"),
      mesa: requireEnv("VARIANT_ID_MESA"),
      juego: requireEnv("VARIANT_ID_JUEGO"),
    },
    apiVersion: process.env.SHOPIFY_API_VERSION || SHOPIFY_API_VERSION,
  };
}

module.exports = { getConfig };
