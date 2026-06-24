const { loadComponentStock } = require("./loadComponentStock");
const { setAvailableQuantity } = require("../shopifyAdmin");

/**
 * Suma stock de componentes por SKU (devolución por cancelación/reembolso).
 */
async function applyComponentRestocks(restockLines, config) {
  if (!restockLines.length) {
    return [];
  }

  const { stockBySku, skuIndex, locationId } = await loadComponentStock(config);
  const results = [];

  for (const line of restockLines) {
    const meta = skuIndex.get(line.sku);
    if (!meta) {
      throw new Error(`Componente no encontrado para SKU ${line.sku}`);
    }

    const previous = stockBySku.get(line.sku) ?? 0;
    const requested = Number(line.qty) || 0;
    const next = previous + requested;

    await setAvailableQuantity(meta.inventoryItemGid, locationId, next);
    stockBySku.set(line.sku, next);

    results.push({
      sku: line.sku,
      label: line.label || meta.productTitle,
      previous,
      restored: requested,
      next,
    });
  }

  return results;
}

module.exports = { applyComponentRestocks };
