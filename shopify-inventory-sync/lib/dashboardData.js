const { getSyncConfig } = require("./config");
const {
  getProductWithVariants,
  resolveLocationId,
  getAvailableQuantities,
} = require("./shopifyAdmin");

const PRODUCT_LABELS = {
  juego: "Juego Living Exterior",
  sillon1: "Sillón 1 Cuerpo",
  sillon3: "Sillón 3 Cuerpos",
  mesa: "Mesa Ratona",
  reposera: "Reposera",
};

const PRODUCT_ORDER = ["juego", "sillon1", "sillon3", "mesa", "reposera"];

async function loadProductStock(productKey, productId) {
  const product = await getProductWithVariants(productId);
  return { key: productKey, productId, product };
}

function sumAvailable(variants, levels) {
  return variants.reduce((sum, v) => sum + (levels.get(v.inventoryItemGid) ?? 0), 0);
}

/**
 * Fetches current stock summary for dashboard cards.
 */
async function getDashboardStockSummary() {
  const config = getSyncConfig();
  const { productIds, locationId: configuredLocationId } = config;

  const entries = await Promise.all(
    Object.entries(productIds).map(([key, id]) => loadProductStock(key, id))
  );

  const allItemGids = entries
    .flatMap((e) => e.product.variants.map((v) => v.inventoryItemGid))
    .filter(Boolean);

  if (allItemGids.length === 0) {
    throw new Error("No se encontraron variantes con inventario");
  }

  const locationId = await resolveLocationId(configuredLocationId, allItemGids[0]);
  const levels = await getAvailableQuantities(allItemGids, locationId);

  const products = [];

  for (const key of PRODUCT_ORDER) {
    const entry = entries.find((e) => e.key === key);
    if (!entry) {
      continue;
    }

    const variants = entry.product.variants.map((v) => ({
      title: v.title,
      available: levels.get(v.inventoryItemGid) ?? 0,
    }));

    products.push({
      key,
      title: PRODUCT_LABELS[key] || entry.product.title,
      productTitle: entry.product.title,
      totalAvailable: sumAvailable(entry.product.variants, levels),
      variants,
    });
  }

  return {
    fetchedAt: new Date().toISOString(),
    locationId,
    products,
  };
}

module.exports = { getDashboardStockSummary, PRODUCT_LABELS };
