const { calculateFabricable } = require("./calculate");
const { isPaintedPieceSku } = require("./pieces");

function isStructureSku(sku) {
  return isPaintedPieceSku(sku);
}

function structureLinesFromRecipe(recipe) {
  return recipe.filter((line) => isPaintedPieceSku(line.sku));
}

/** Máximo fabricable de una variante si las piezas de estructura fueran ilimitadas. */
function cushionCapFromRecipe(recipe, stockBySku) {
  const cushionLines = recipe.filter((line) => !isPaintedPieceSku(line.sku));
  if (cushionLines.length === 0) {
    return Infinity;
  }
  return calculateFabricable(stockBySku, cushionLines).fabricable;
}

function structureCapFromRecipe(recipe, stockBySku) {
  const structureLines = structureLinesFromRecipe(recipe);
  if (structureLines.length === 0) {
    throw new Error("Receta sin piezas de estructura pintadas");
  }
  return calculateFabricable(stockBySku, structureLines).fabricable;
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
 * Calcula stock por variante cuando las piezas de estructura se comparten entre telas.
 *
 * Cada variante muestra su MÁXIMO potencial individual: min(almohadones de su
 * tela, piezas pintadas del color), sin repartir entre telas.
 * Esto puede sobre-contar (dos telas pueden mostrar stock contra las mismas
 * piezas; S1 y S3 comparten laterales), pero refleja "qué puedo armar" por color.
 */
function calculateWithSharedStructure(variants, stockBySku, getRecipe) {
  const fabricableByTitle = new Map();
  const metaByTitle = new Map();

  for (const variant of variants) {
    const recipe = getRecipe(variant.parsed);
    const structureLines = structureLinesFromRecipe(recipe);
    if (structureLines.length === 0) {
      throw new Error(`Receta sin piezas de estructura para variante "${variant.title}"`);
    }

    const structureColor = variant.parsed.structureColor;
    const structureStock = structureCapFromRecipe(recipe, stockBySku);
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
  isStructureSku,
  structureCapFromRecipe,
};
