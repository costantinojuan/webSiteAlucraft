const { loadComponentStock } = require("./loadComponentStock");
const { setAvailableQuantity } = require("../shopifyAdmin");

/**
 * Aplica deltas de inventario (pueden ser + o -). Falla si algún SKU quedaría negativo.
 * Primero baja stock, después sube, para no inflar depósito si algo falla a mitad de camino.
 */
async function applyInventoryDeltas(deltas, config) {
  if (!deltas.length) {
    return [];
  }

  const { stockBySku, skuIndex, locationId } = await loadComponentStock(config);

  for (const line of deltas) {
    const sku = line.sku;
    const meta = skuIndex.get(sku);
    if (!meta) {
      throw new Error(`Componente no encontrado para SKU ${sku}`);
    }

    const previous = stockBySku.get(sku) ?? 0;
    const delta = Number(line.delta) || 0;
    const next = previous + delta;

    if (next < 0) {
      throw new Error(
        `Stock insuficiente de ${meta.productTitle} / ${meta.variantTitle}: hay ${previous}, hace falta ${-delta}`
      );
    }
  }

  const ordered = [...deltas].sort((a, b) => (Number(a.delta) || 0) - (Number(b.delta) || 0));
  const results = [];

  for (const line of ordered) {
    const meta = skuIndex.get(line.sku);
    const previous = stockBySku.get(line.sku) ?? 0;
    const delta = Number(line.delta) || 0;
    const next = previous + delta;

    await setAvailableQuantity(meta.inventoryItemGid, locationId, next);
    stockBySku.set(line.sku, next);

    results.push({
      sku: line.sku,
      label: line.label || `${meta.productTitle} / ${meta.variantTitle}`,
      previous,
      delta,
      next,
    });
  }

  return results;
}

module.exports = { applyInventoryDeltas };
