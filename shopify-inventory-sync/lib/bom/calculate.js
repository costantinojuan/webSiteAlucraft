/**
 * Cuántas unidades se pueden fabricar y qué componente limita.
 * @param {Map<string, number>} stockBySku
 * @param {{ sku: string, qty: number, label: string }[]} lines
 */
function calculateFabricable(stockBySku, lines) {
  if (!lines.length) {
    return { fabricable: 0, bottleneck: null };
  }

  let fabricable = Infinity;
  let bottleneck = null;

  for (const line of lines) {
    const available = Number(stockBySku.get(line.sku)) || 0;
    const yieldForLine = Math.floor(available / line.qty);

    if (yieldForLine < fabricable) {
      fabricable = yieldForLine;
      bottleneck = {
        sku: line.sku,
        label: line.label,
        available,
        qtyPerUnit: line.qty,
      };
    }
  }

  if (!Number.isFinite(fabricable)) {
    fabricable = 0;
  }

  return { fabricable, bottleneck };
}

module.exports = { calculateFabricable };
