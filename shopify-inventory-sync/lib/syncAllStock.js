const { getSyncConfig } = require("./config");
const { calculateJuegoStock } = require("./syncJuegoStock");
const {
  getProductWithVariants,
  getAvailableQuantities,
  setAvailableQuantity,
} = require("./shopifyAdmin");
const { loadComponentStock } = require("./bom/loadComponentStock");
const { getRecipe } = require("./bom/recipes");
const { calculateFabricable } = require("./bom/calculate");
const {
  parseVariantTitle,
  parseMesaVariantTitle,
  mesaColorFromJuegoTitle,
} = require("./bom/parseVariant");

async function syncFinishedProductFromComponents({
  productKey,
  productId,
  stockBySku,
  locationId,
  parseTitle,
}) {
  const product = await getProductWithVariants(productId);
  const itemGids = product.variants.map((v) => v.inventoryItemGid).filter(Boolean);
  const previousLevels =
    itemGids.length > 0 ? await getAvailableQuantities(itemGids, locationId) : new Map();

  const synced = [];
  const calculatedByTitle = new Map();

  for (const variant of product.variants) {
    const parsed = parseTitle(variant.title);
    const recipe = getRecipe(productKey, parsed);
    const { fabricable, bottleneck } = calculateFabricable(stockBySku, recipe);
    const previousAvailable = previousLevels.get(variant.inventoryItemGid) ?? 0;

    calculatedByTitle.set(variant.title, fabricable);

    const updated = await setAvailableQuantity(
      variant.inventoryItemGid,
      locationId,
      fabricable
    );

    synced.push({
      variant: variant.title,
      variantId: variant.variantId,
      recipe: recipe.map((line) => ({
        sku: line.sku,
        qty: line.qty,
        available: stockBySku.get(line.sku) ?? 0,
      })),
      bottleneck,
      previousAvailable,
      calculated: fabricable,
      available: updated.quantity,
    });
  }

  return {
    productId: product.productId,
    title: product.title,
    synced,
    calculatedByTitle,
  };
}

/**
 * Recalcula inventario de productos terminados a partir de componentes (BOM).
 */
async function syncAllStock() {
  const config = getSyncConfig();
  const { productIds } = config;

  const { locationId, stockBySku, resolvedProducts, expectedSkus } =
    await loadComponentStock(config);

  const sillon1Result = await syncFinishedProductFromComponents({
    productKey: "sillon1",
    productId: productIds.sillon1,
    stockBySku,
    locationId,
    parseTitle: parseVariantTitle,
  });

  const sillon3Result = await syncFinishedProductFromComponents({
    productKey: "sillon3",
    productId: productIds.sillon3,
    stockBySku,
    locationId,
    parseTitle: parseVariantTitle,
  });

  const mesaResult = await syncFinishedProductFromComponents({
    productKey: "mesa",
    productId: productIds.mesa,
    stockBySku,
    locationId,
    parseTitle: parseMesaVariantTitle,
  });

  let reposeraResult = null;
  if (productIds.reposera) {
    reposeraResult = await syncFinishedProductFromComponents({
      productKey: "reposera",
      productId: productIds.reposera,
      stockBySku,
      locationId,
      parseTitle: parseVariantTitle,
    });
  }

  const juegoProduct = await getProductWithVariants(productIds.juego);
  const juegoItemGids = juegoProduct.variants.map((v) => v.inventoryItemGid).filter(Boolean);
  const juegoPrevious =
    juegoItemGids.length > 0
      ? await getAvailableQuantities(juegoItemGids, locationId)
      : new Map();

  const juegoSynced = [];

  for (const variant of juegoProduct.variants) {
    const title = variant.title;
    const mesaColor = mesaColorFromJuegoTitle(title);

    const stockSillon1 = sillon1Result.calculatedByTitle.get(title) ?? 0;
    const stockSillon3 = sillon3Result.calculatedByTitle.get(title) ?? 0;
    const stockMesa = mesaResult.calculatedByTitle.get(mesaColor) ?? 0;
    const previousJuego = juegoPrevious.get(variant.inventoryItemGid) ?? 0;
    const stockJuego = calculateJuegoStock(stockSillon1, stockSillon3, stockMesa);

    const updated = await setAvailableQuantity(
      variant.inventoryItemGid,
      locationId,
      stockJuego
    );

    juegoSynced.push({
      variant: title,
      variantId: variant.variantId,
      components: {
        sillon1: { title, calculated: stockSillon1 },
        sillon3: { title, calculated: stockSillon3 },
        mesa: { title: mesaColor, calculated: stockMesa },
      },
      previousAvailable: previousJuego,
      calculated: stockJuego,
      available: updated.quantity,
    });
  }

  return {
    mode: "components",
    locationId,
    locationSource: config.locationId ? "env" : "auto-detected",
    components: {
      products: resolvedProducts,
      stockBySku: Object.fromEntries(stockBySku),
      expectedSkuCount: expectedSkus.length,
    },
    products: {
      sillon1: {
        id: sillon1Result.productId,
        title: sillon1Result.title,
        synced: sillon1Result.synced,
      },
      sillon3: {
        id: sillon3Result.productId,
        title: sillon3Result.title,
        synced: sillon3Result.synced,
      },
      mesa: {
        id: mesaResult.productId,
        title: mesaResult.title,
        synced: mesaResult.synced,
      },
      reposera: reposeraResult
        ? {
            id: reposeraResult.productId,
            title: reposeraResult.title,
            synced: reposeraResult.synced,
          }
        : null,
      juego: {
        id: juegoProduct.productId,
        title: juegoProduct.title,
        synced: juegoSynced,
      },
    },
  };
}

module.exports = { syncAllStock };
