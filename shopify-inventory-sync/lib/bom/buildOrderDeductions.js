const { getRecipe, getJuegoSaleRecipe, mergeRecipeLines } = require("./recipes");
const { parseVariantTitle, parseMesaVariantTitle } = require("./parseVariant");

function buildProductKeyById(productIds) {
  const map = new Map();
  for (const [key, id] of Object.entries(productIds)) {
    if (id) {
      map.set(String(id), key);
    }
  }
  return map;
}

function resolveVariantTitle(lineItem) {
  const variantTitle = String(lineItem.variant_title || "").trim();
  if (variantTitle && variantTitle !== "Default Title") {
    return variantTitle;
  }

  const name = String(lineItem.name || "").trim();
  const productTitle = String(lineItem.title || lineItem.product_title || "").trim();

  if (name && productTitle && name.startsWith(productTitle)) {
    const suffix = name.slice(productTitle.length).replace(/^[\s\-–—]+/, "").trim();
    if (suffix) {
      return suffix;
    }
  }

  if (name.includes(" / ")) {
    return name;
  }

  throw new Error(
    `No se pudo determinar la variante del ítem "${name || lineItem.title}" (variant_id ${lineItem.variant_id})`
  );
}

function saleRecipeForProduct(productKey, variantTitle, orderQty) {
  let baseLines;

  if (productKey === "juego") {
    baseLines = getJuegoSaleRecipe(parseVariantTitle(variantTitle));
  } else if (productKey === "mesa") {
    baseLines = getRecipe("mesa", parseMesaVariantTitle(variantTitle));
  } else {
    baseLines = getRecipe(productKey, parseVariantTitle(variantTitle));
  }

  return baseLines.map((line) => ({
    ...line,
    qty: line.qty * orderQty,
  }));
}

/**
 * Arma deducciones de componentes desde line_items de un pedido pagado.
 */
function buildOrderDeductions(order, productIds) {
  const productKeyById = buildProductKeyById(productIds);
  const allLines = [];
  const items = [];

  for (const lineItem of order.line_items || []) {
    const productKey = productKeyById.get(String(lineItem.product_id));
    const orderQty = Number(lineItem.quantity) || 0;

    if (!productKey || orderQty <= 0) {
      continue;
    }

    let variantTitle;
    try {
      variantTitle = resolveVariantTitle(lineItem);
      const recipeLines = saleRecipeForProduct(productKey, variantTitle, orderQty);
      allLines.push(...recipeLines);
      items.push({
        productKey,
        productTitle: lineItem.title || lineItem.name,
        variantTitle,
        quantity: orderQty,
        components: recipeLines,
      });
    } catch (error) {
      items.push({
        productKey,
        productTitle: lineItem.title || lineItem.name,
        variantTitle: lineItem.variant_title || null,
        quantity: orderQty,
        error: error.message,
      });
    }
  }

  return {
    lines: mergeRecipeLines(allLines),
    items,
  };
}

module.exports = {
  buildOrderDeductions,
  buildProductKeyById,
  resolveVariantTitle,
  saleRecipeForProduct,
};
