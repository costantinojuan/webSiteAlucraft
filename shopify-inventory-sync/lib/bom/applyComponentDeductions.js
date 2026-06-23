const { loadComponentStock } = require("./loadComponentStock");
const { setAvailableQuantity } = require("../shopifyAdmin");

/**
 * Descuenta stock de componentes por SKU (nunca baja de 0).
 */
async function applyComponentDeductions(deductionLines, config) {
  if (!deductionLines.length) {
    return [];
  }

  const { stockBySku, skuIndex, locationId } = await loadComponentStock(config);
  const results = [];

  for (const line of deductionLines) {
    const meta = skuIndex.get(line.sku);
    if (!meta) {
      throw new Error(`Componente no encontrado para SKU ${line.sku}`);
    }

    const previous = stockBySku.get(line.sku) ?? 0;
    const requested = Number(line.qty) || 0;
    const next = Math.max(0, previous - requested);

    await setAvailableQuantity(meta.inventoryItemGid, locationId, next);
    stockBySku.set(line.sku, next);

    results.push({
      sku: line.sku,
      label: line.label || meta.productTitle,
      previous,
      deducted: requested,
      next,
      clamped: next < previous - requested,
    });
  }

  return results;
}

module.exports = { applyComponentDeductions };
