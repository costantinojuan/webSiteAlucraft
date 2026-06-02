const { getConfig } = require("./config");
const { parseNumericId } = require("./gids");
const {
  getVariantsWithInventoryItems,
  getAvailableQuantities,
  setAvailableQuantity,
} = require("./shopifyAdmin");

/**
 * stockJuego = min(floor(sillon1/2), sillon3, mesa)
 */
function calculateJuegoStock(stockSillon1, stockSillon3, stockMesa) {
  const s1 = Number(stockSillon1) || 0;
  const s3 = Number(stockSillon3) || 0;
  const mesa = Number(stockMesa) || 0;

  return Math.min(Math.floor(s1 / 2), s3, mesa);
}

/**
 * Recalcula y fija el stock del Juego Living Exterior.
 *
 * No depende del contenido de la orden del webhook: siempre lee el inventario
 * actual de Sillón 1, Sillón 3 y Mesa en LOCATION_ID y aplica la fórmula.
 * Cualquier orders/paid (Juego, sillón suelto, mesa, etc.) dispara el mismo cálculo.
 */
async function syncJuegoLivingStock() {
  const config = getConfig();
  const { variantIds, locationId } = config;

  const variants = await getVariantsWithInventoryItems(variantIds);

  const allItemGids = [
    variants.sillon1.inventoryItemGid,
    variants.sillon3.inventoryItemGid,
    variants.mesa.inventoryItemGid,
    variants.juego.inventoryItemGid,
  ];

  const levels = await getAvailableQuantities(allItemGids, locationId);

  const stockSillon1 = levels.get(variants.sillon1.inventoryItemGid) ?? 0;
  const stockSillon3 = levels.get(variants.sillon3.inventoryItemGid) ?? 0;
  const stockMesa = levels.get(variants.mesa.inventoryItemGid) ?? 0;
  const previousJuegoStock = levels.get(variants.juego.inventoryItemGid) ?? 0;

  const stockJuego = calculateJuegoStock(stockSillon1, stockSillon3, stockMesa);

  const updated = await setAvailableQuantity(
    variants.juego.inventoryItemGid,
    locationId,
    stockJuego
  );

  return {
    components: {
      sillon1: {
        variantId: variantIds.sillon1,
        inventoryItemId: parseNumericId(variants.sillon1.inventoryItemGid),
        available: stockSillon1,
      },
      sillon3: {
        variantId: variantIds.sillon3,
        inventoryItemId: parseNumericId(variants.sillon3.inventoryItemGid),
        available: stockSillon3,
      },
      mesa: {
        variantId: variantIds.mesa,
        inventoryItemId: parseNumericId(variants.mesa.inventoryItemGid),
        available: stockMesa,
      },
    },
    juego: {
      variantId: variantIds.juego,
      inventoryItemId: parseNumericId(variants.juego.inventoryItemGid),
      previousAvailable: previousJuegoStock,
      available: updated.quantity,
      calculated: stockJuego,
    },
  };
}

module.exports = { calculateJuegoStock, syncJuegoLivingStock };
