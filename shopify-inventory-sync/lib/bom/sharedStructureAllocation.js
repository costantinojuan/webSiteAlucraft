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
 */
function calculateWithSharedStructure(variants, stockBySku, getRecipe) {
  const byStructure = new Map();

  for (const variant of variants) {
    const recipe = getRecipe(variant.parsed);
    const structureLine = structureLineFromRecipe(recipe);
    if (!structureLine) {
      throw new Error(`Receta sin estructura para variante "${variant.title}"`);
    }

    const structureColor = variant.parsed.structureColor;
    const cushionCap = cushionCapFromRecipe(recipe, stockBySku);
    const structureStock = stockBySku.get(structureLine.sku) ?? 0;

    if (!byStructure.has(structureColor)) {
      byStructure.set(structureColor, {
        structureLine,
        structureStock,
        variants: [],
      });
    }

    byStructure.get(structureColor).variants.push({
      title: variant.title,
      fabricColor: variant.parsed.fabricColor,
      cushionCap,
      recipe,
    });
  }

  const fabricableByTitle = new Map();
  const metaByTitle = new Map();

  for (const [structureColor, group] of byStructure.entries()) {
    const allocated = allocateSharedStructurePool(group.structureStock, group.variants);
    const totalCushionCap = group.variants.reduce((sum, v) => sum + v.cushionCap, 0);
    const totalAllocated = [...allocated.values()].reduce((sum, n) => sum + n, 0);
    const structureLimited = totalAllocated < totalCushionCap;

    for (const variant of group.variants) {
      const fabricable = allocated.get(variant.title) ?? 0;
      fabricableByTitle.set(variant.title, fabricable);

      let bottleneck = null;
      if (fabricable === 0) {
        if (variant.cushionCap === 0) {
          const cushionOnly = calculateFabricable(
            stockBySku,
            variant.recipe.filter((line) => !isStructureSku(line.sku))
          );
          bottleneck = cushionOnly.bottleneck;
        } else if (structureLimited || group.structureStock === 0) {
          bottleneck = {
            sku: group.structureLine.sku,
            label: `${group.structureLine.label} (compartida, ${group.structureStock} total)`,
            available: group.structureStock,
            qtyPerUnit: 1,
          };
        } else {
          bottleneck = {
            sku: group.structureLine.sku,
            label: group.structureLine.label,
            available: group.structureStock,
            qtyPerUnit: 1,
          };
        }
      } else if (fabricable < variant.cushionCap) {
        bottleneck = {
          sku: group.structureLine.sku,
          label: `${group.structureLine.label} (compartida entre telas ${structureColor})`,
          available: group.structureStock,
          qtyPerUnit: 1,
        };
      } else {
        const cushionOnly = calculateFabricable(
          stockBySku,
          variant.recipe.filter((line) => !isStructureSku(line.sku))
        );
        bottleneck = cushionOnly.bottleneck;
      }

      metaByTitle.set(variant.title, {
        cushionCap: variant.cushionCap,
        structureColor,
        structureStock: group.structureStock,
        structureShared: true,
        bottleneck,
      });
    }
  }

  return { fabricableByTitle, metaByTitle };
}

module.exports = {
  allocateSharedStructurePool,
  calculateWithSharedStructure,
  cushionCapFromRecipe,
};
