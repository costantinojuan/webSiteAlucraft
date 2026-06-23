const { getSyncConfig } = require("./config");
const { parseNumericId } = require("./gids");
const {
  getProductWithVariants,
  resolveLocationId,
  getAvailableQuantities,
  setAvailableQuantity,
} = require("./shopifyAdmin");

const { mesaColorFromJuegoTitle } = require("./bom/parseVariant");

/**
 * stockJuego = min(floor(sillon1/2), sillon3, mesa)
 */
function calculateJuegoStock(stockSillon1, stockSillon3, stockMesa) {
  const s1 = Number(stockSillon1) || 0;
  const s3 = Number(stockSillon3) || 0;
  const mesa = Number(stockMesa) || 0;

  return Math.min(Math.floor(s1 / 2), s3, mesa);
}

function indexVariantsByTitle(variants) {
  const map = new Map();
  for (const v of variants) {
    map.set(v.title, v);
  }
  return map;
}

function findVariantByTitle(variantsByTitle, title, productLabel) {
  const variant = variantsByTitle.get(title);
  if (!variant?.inventoryItemGid) {
    throw new Error(`No hay variante "${title}" en ${productLabel}`);
  }
  return variant;
}

/**
 * Sincroniza cada variante del Juego Living según la combinación de color.
 * Ej.: Juego "Marrón / Gris oscuro" usa Sillón1 y Sillón3 con el mismo título
 * y Mesa "Marrón".
 */
async function syncJuegoLivingStock() {
  const config = getSyncConfig();
  const { productIds, locationId: configuredLocationId } = config;

  const [sillon1Product, sillon3Product, mesaProduct, juegoProduct] = await Promise.all([
    getProductWithVariants(productIds.sillon1),
    getProductWithVariants(productIds.sillon3),
    getProductWithVariants(productIds.mesa),
    getProductWithVariants(productIds.juego),
  ]);

  const sillon1ByTitle = indexVariantsByTitle(sillon1Product.variants);
  const sillon3ByTitle = indexVariantsByTitle(sillon3Product.variants);
  const mesaByTitle = indexVariantsByTitle(mesaProduct.variants);

  const allItemGids = [
    ...sillon1Product.variants,
    ...sillon3Product.variants,
    ...mesaProduct.variants,
    ...juegoProduct.variants,
  ]
    .map((v) => v.inventoryItemGid)
    .filter(Boolean);

  const sampleItem = allItemGids[0];
  if (!sampleItem) {
    throw new Error("No se encontraron ítems de inventario en los productos configurados");
  }

  const locationId = await resolveLocationId(configuredLocationId, sampleItem);
  const levels = await getAvailableQuantities(allItemGids, locationId);

  const results = [];

  for (const juegoVariant of juegoProduct.variants) {
    const title = juegoVariant.title;
    const mesaColor = mesaColorFromJuegoTitle(title);

    const sillon1Variant = findVariantByTitle(sillon1ByTitle, title, sillon1Product.title);
    const sillon3Variant = findVariantByTitle(sillon3ByTitle, title, sillon3Product.title);
    const mesaVariant = findVariantByTitle(mesaByTitle, mesaColor, mesaProduct.title);

    const stockSillon1 = levels.get(sillon1Variant.inventoryItemGid) ?? 0;
    const stockSillon3 = levels.get(sillon3Variant.inventoryItemGid) ?? 0;
    const stockMesa = levels.get(mesaVariant.inventoryItemGid) ?? 0;
    const previousJuego = levels.get(juegoVariant.inventoryItemGid) ?? 0;

    const stockJuego = calculateJuegoStock(stockSillon1, stockSillon3, stockMesa);

    const updated = await setAvailableQuantity(
      juegoVariant.inventoryItemGid,
      locationId,
      stockJuego
    );

    results.push({
      juegoVariant: title,
      juegoVariantId: juegoVariant.variantId,
      components: {
        sillon1: { title, available: stockSillon1 },
        sillon3: { title, available: stockSillon3 },
        mesa: { title: mesaColor, available: stockMesa },
      },
      juego: {
        previousAvailable: previousJuego,
        calculated: stockJuego,
        available: updated.quantity,
      },
    });
  }

  return {
    locationId,
    locationSource: configuredLocationId ? "env" : "auto-detected",
    products: {
      sillon1: { id: sillon1Product.productId, title: sillon1Product.title },
      sillon3: { id: sillon3Product.productId, title: sillon3Product.title },
      mesa: { id: mesaProduct.productId, title: mesaProduct.title },
      juego: { id: juegoProduct.productId, title: juegoProduct.title },
    },
    synced: results,
  };
}

module.exports = { calculateJuegoStock, syncJuegoLivingStock, mesaColorFromJuegoTitle };
