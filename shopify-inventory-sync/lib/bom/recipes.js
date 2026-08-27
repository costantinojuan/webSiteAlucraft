const { skuForFabric, skuForBox, skuForAllen } = require("./colors");
const { pieceLinesForProduct } = require("./pieces");

function packagingLines(productKey, productLabel) {
  return [
    {
      sku: skuForBox(productKey),
      qty: 1,
      label: `Caja ${productLabel}`,
    },
    {
      sku: skuForAllen(),
      qty: 1,
      label: `Llave Allen (${productLabel})`,
    },
  ];
}
  
/**
 * Líneas BOM: { sku, qty, label } por unidad fabricable.
 */
function recipeSillon1(parsed) {
  const { structureColor, fabricColor } = parsed;
  return [
    ...pieceLinesForProduct("sillon1", structureColor),
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
    ...packagingLines("sillon1", "Sillón 1"),
  ];
}

function recipeSillon3(parsed) {
  const { structureColor, fabricColor } = parsed;
  return [
    ...pieceLinesForProduct("sillon3", structureColor),
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
    ...packagingLines("sillon3", "Sillón 3"),
  ];
}

function recipeReposera(parsed) {
  const { structureColor, fabricColor } = parsed;
  return [
    ...pieceLinesForProduct("reposera", structureColor),
    {
      sku: skuForFabric("reposera", fabricColor),
      qty: 1,
      label: `Almohadón Reposera (${fabricColor})`,
    },
    ...packagingLines("reposera", "Reposera"),
  ];
}

function recipeMesa(parsed) {
  const { structureColor } = parsed;
  return [
    ...pieceLinesForProduct("mesa", structureColor),
    ...packagingLines("mesa", "Mesa ratona"),
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
