const { getSyncConfig } = require("./config");
const {
  getProductWithVariants,
  resolveLocationId,
  getAvailableQuantities,
} = require("./shopifyAdmin");

const CACHE_MS = 20 * 1000;

let cache = {
  expiresAt: 0,
  payload: null,
};

function emptyPayload() {
  return { quantities: {} };
}

async function loadVitrinaStock() {
  const config = getSyncConfig();
  const { productIds, locationId: configuredLocationId } = config;
  const ids = Object.values(productIds).filter(Boolean);

  const products = await Promise.all(ids.map((id) => getProductWithVariants(id)));
  const itemGids = products
    .flatMap((product) => product.variants.map((variant) => variant.inventoryItemGid))
    .filter(Boolean);

  if (!itemGids.length) {
    return emptyPayload();
  }

  const locationId = await resolveLocationId(configuredLocationId, itemGids[0]);
  const levels = await getAvailableQuantities(itemGids, locationId);
  const quantities = {};

  for (const product of products) {
    for (const variant of product.variants) {
      const qty = levels.get(variant.inventoryItemGid);
      const available = Number.isFinite(qty) ? Math.max(0, qty) : 0;
      if (variant.variantGid) {
        quantities[variant.variantGid] = available;
      }
      if (variant.variantId) {
        quantities[String(variant.variantId)] = available;
      }
    }
  }

  return { quantities };
}

async function getPublicVitrinaStock() {
  const now = Date.now();
  if (cache.payload && cache.expiresAt > now) {
    return cache.payload;
  }

  const payload = await loadVitrinaStock();
  cache = {
    expiresAt: now + CACHE_MS,
    payload,
  };
  return payload;
}

module.exports = { getPublicVitrinaStock };
