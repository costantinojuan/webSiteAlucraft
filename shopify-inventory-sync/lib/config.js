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

/**
 * Auth: legacy shpat_ OR Dev Dashboard client credentials (desde ene 2026).
 */
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

function getConfig() {
  getAuthConfig();

  return {
    storeDomain: getStoreDomain(),
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

module.exports = { getConfig, getAuthConfig, getStoreDomain };
