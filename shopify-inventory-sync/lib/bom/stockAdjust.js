const { mergeDeltas } = require("./paint");
const { applyInventoryDeltas } = require("./applyInventoryDeltas");
const { loadComponentStock } = require("./loadComponentStock");

const MODES = new Set(["add", "subtract", "set"]);

function parseQty(value) {
  if (value === "" || value == null) {
    return null;
  }
  const qty = Math.floor(Number(value));
  if (!Number.isFinite(qty)) {
    throw new Error("La cantidad tiene que ser un número entero");
  }
  return qty;
}

/**
 * mode:
 * - add: suma lo que llegó
 * - subtract: resta (rotura, ajuste)
 * - set: deja el número del conteo
 */
function buildStockAdjustDeltas({ mode, lines, stockBySku }) {
  if (!MODES.has(mode)) {
    throw new Error(`Modo de carga inválido: ${mode}`);
  }
  if (!Array.isArray(lines)) {
    throw new Error("Las líneas tienen que ser una lista");
  }
  if (!(stockBySku instanceof Map)) {
    throw new Error("Falta el stock actual");
  }

  const deltas = [];

  for (const line of lines) {
    const sku = String(line?.sku || "").trim();
    if (!sku) {
      throw new Error("Falta el código de un componente");
    }
    if (!stockBySku.has(sku)) {
      throw new Error(`Componente no encontrado para SKU ${sku}`);
    }

    const qty = parseQty(line.qty);
    if (qty == null) {
      continue;
    }

    const previous = stockBySku.get(sku) ?? 0;
    const label = line.label || sku;
    let delta = 0;

    if (mode === "add") {
      if (qty < 1) continue;
      delta = qty;
    } else if (mode === "subtract") {
      if (qty < 1) continue;
      delta = -qty;
    } else {
      if (qty < 0) {
        throw new Error(`La cantidad de ${label} no puede ser negativa`);
      }
      delta = qty - previous;
    }

    if (delta === 0) {
      continue;
    }

    const next = previous + delta;
    if (next < 0) {
      throw new Error(
        `Stock insuficiente de ${label}: hay ${previous}, hace falta ${-delta}`
      );
    }

    deltas.push({ sku, delta, label });
  }

  const merged = mergeDeltas(deltas);
  if (!merged.length) {
    throw new Error("Marcá al menos una cantidad");
  }
  return merged;
}

async function applyStockAdjust({ mode, lines }, config) {
  const { stockBySku, skuIndex } = await loadComponentStock(config);
  const labeled = (lines || []).map((line) => {
    const sku = String(line?.sku || "").trim();
    const meta = skuIndex.get(sku);
    return {
      ...line,
      sku,
      label: line.label || (meta ? `${meta.productTitle} / ${meta.variantTitle}` : sku),
    };
  });
  const deltas = buildStockAdjustDeltas({ mode, lines: labeled, stockBySku });
  return applyInventoryDeltas(deltas, config);
}

module.exports = { buildStockAdjustDeltas, applyStockAdjust };
