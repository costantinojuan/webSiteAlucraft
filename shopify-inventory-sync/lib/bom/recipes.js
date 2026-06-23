const { skuForStructure, skuForFabric } = require("./colors");

/**
 * Líneas BOM: { sku, qty, label } por unidad fabricable.
 */
function recipeSillon1(parsed) {
  const { structureColor, fabricColor } = parsed;
  return [
    {
      sku: skuForStructure("sillon1", structureColor),
      qty: 1,
      label: `Estructura Sillón 1 (${structureColor})`,
    },
    {
      sku: skuForFabric("baseSillon1", fabricColor),
      qty: 1,
      label: `Almohadón base S1 (${fabricColor})`,
    },
    {
      sku: skuForFabric("respaldoSillon1", fabricColor),
      qty: 1,
      label: `Almohadón respaldo S1 (${fabricColor})`,
    },
  ];
}

function recipeSillon3(parsed) {
  const { structureColor, fabricColor } = parsed;
  return [
    {
      sku: skuForStructure("sillon3", structureColor),
      qty: 1,
      label: `Estructura Sillón 3 (${structureColor})`,
    },
    {
      sku: skuForFabric("baseSillon3", fabricColor),
      qty: 1,
      label: `Almohadón base S3 (${fabricColor})`,
    },
    {
      sku: skuForFabric("respaldoSillon3", fabricColor),
      qty: 2,
      label: `Almohadón respaldo S3 (${fabricColor})`,
    },
  ];
}

function recipeReposera(parsed) {
  const { structureColor, fabricColor } = parsed;
  return [
    {
      sku: skuForStructure("reposera", structureColor),
      qty: 1,
      label: `Estructura Reposera (${structureColor})`,
    },
    {
      sku: skuForFabric("reposera", fabricColor),
      qty: 1,
      label: `Almohadón Reposera (${fabricColor})`,
    },
  ];
}

function recipeMesa(parsed) {
  const { structureColor } = parsed;
  return [
    {
      sku: skuForStructure("mesa", structureColor),
      qty: 1,
      label: `Mesa Ratona componente (${structureColor})`,
    },
  ];
}

const RECIPE_BY_PRODUCT = {
  sillon1: recipeSillon1,
  sillon3: recipeSillon3,
  reposera: recipeReposera,
  mesa: recipeMesa,
};

function getRecipe(productKey, parsed) {
  const builder = RECIPE_BY_PRODUCT[productKey];
  if (!builder) {
    throw new Error(`No hay receta BOM para: ${productKey}`);
  }
  return builder(parsed);
}

/** Suma líneas BOM por SKU. */
function mergeRecipeLines(lines) {
  const bySku = new Map();

  for (const line of lines) {
    const prev = bySku.get(line.sku);
    if (prev) {
      prev.qty += line.qty;
    } else {
      bySku.set(line.sku, { sku: line.sku, qty: line.qty, label: line.label });
    }
  }

  return [...bySku.values()];
}

/** Componentes que consume 1 Juego Living vendido. */
function getJuegoSaleRecipe(parsed) {
  const { mesaColorFromJuegoTitle } = require("./parseVariant");
  const { parseMesaVariantTitle } = require("./parseVariant");

  const lines = [];

  for (const line of recipeSillon1(parsed)) {
    lines.push({ ...line, qty: line.qty * 2 });
  }

  lines.push(...recipeSillon3(parsed));

  const mesaColor = mesaColorFromJuegoTitle(parsed.title);
  lines.push(...recipeMesa(parseMesaVariantTitle(mesaColor)));

  return mergeRecipeLines(lines);
}

module.exports = {
  getRecipe,
  getJuegoSaleRecipe,
  mergeRecipeLines,
  recipeSillon1,
  recipeSillon3,
  recipeReposera,
  recipeMesa,
};
