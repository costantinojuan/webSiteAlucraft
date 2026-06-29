const { calculateFabricable } = require("./calculate");

function isStructureSku(sku) {
  return String(sku).startsWith("EST-");
}

/** Máximo fabricable de una variante si la estructura fuera exclusiva (solo almohadones). */
function cushionCapFromRecipe(recipe, stockBySku) {
  const cushionLines = recipe.filter((line) => !isStructureSku(line.sku));
  if (cushionLines.length === 0) {
    return Infinity;
  }
  return calculateFabricable(stockBySku, cushionLines).fabricable;
}

function structureLineFromRecipe(recipe) {
  return recipe.find((line) => isStructureSku(line.sku)) || null;
}

/**
 * Reparte el stock de estructura entre variantes del mismo color de estructura.
 * Evita contar la misma estructura 3 veces (una por cada tela).
 *
 * Usa reparto round-robin estable por nombre de tela.
 */
function allocateSharedStructurePool(structureStock, variants) {
  const sorted = [...variants].sort((a, b) =>
    a.fabricColor.localeCompare(b.fabricColor, "es")
  );

  const allocated = new Map();
  for (const variant of sorted) {
    allocated.set(variant.title, 0);
  }

  let remaining = Math.max(0, Number(structureStock) || 0);

  while (remaining > 0) {
    let progressed = false;

    for (const variant of sorted) {
      const current = allocated.get(variant.title) ?? 0;
      if (current < variant.cushionCap && remaining > 0) {
        allocated.set(variant.title, current + 1);
        remaining -= 1;
        progressed = true;
      }
    }

    if (!progressed) {
      break;
    }
  }

  return allocated;
}

/**
 * Calcula stock por variante cuando la estructura se comparte entre telas.
 *
 * Cada variante muestra su MÁXIMO potencial individual: min(almohadones de su
 * tela, estructuras totales del color), sin repartir la estructura entre telas.
 * Esto puede sobre-contar (dos telas pueden mostrar stock contra la misma
 * estructura), pero refleja "qué puedo armar" por color, que es lo deseado para
 * un negocio a pedido. La sobreventa eventual se maneja manualmente.
 */
function calculateWithSharedStructure(variants, stockBySku, getRecipe) {
  const fabricableByTitle = new Map();
  const metaByTitle = new Map();

  for (const variant of variants) {
    const recipe = getRecipe(variant.parsed);
    const structureLine = structureLineFromRecipe(recipe);
    if (!structureLine) {
      throw new Error(`Receta sin estructura para variante "${variant.title}"`);
    }

    const structureColor = variant.parsed.structureColor;
    const structureStock = stockBySku.get(structureLine.sku) ?? 0;
    const cushionCap = cushionCapFromRecipe(recipe, stockBySku);

    const { fabricable, bottleneck } = calculateFabricable(stockBySku, recipe);
    fabricableByTitle.set(variant.title, fabricable);

    metaByTitle.set(variant.title, {
      cushionCap,
      structureColor,
      structureStock,
      structureShared: true,
      bottleneck,
    });
  }

  return { fabricableByTitle, metaByTitle };
}

module.exports = {
  allocateSharedStructurePool,
  calculateWithSharedStructure,
  cushionCapFromRecipe,
};
