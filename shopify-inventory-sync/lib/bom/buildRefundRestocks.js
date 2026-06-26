const {
  buildProductKeyById,
  resolveVariantTitle,
  saleRecipeForProduct,
} = require("./buildOrderDeductions");
const { mergeRecipeLines } = require("./recipes");
const { collectRefundLineItems } = require("./normalizeRefundPayload");

function shouldRestockRefundLine(refundLineItem) {
  const restockType = String(refundLineItem.restock_type || "").trim().toLowerCase();
  if (restockType === "no_restock") {
    return false;
  }
  if (restockType.length > 0) {
    return true;
  }
  return Boolean(refundLineItem.location_id);
}

/**
 * Arma devoluciones de componentes desde refund_line_items con restock.
 */
function buildRefundRestocks(refund, productIds) {
  const productKeyById = buildProductKeyById(productIds);
  const allLines = [];
  const items = [];
  const refundLineItems = collectRefundLineItems(refund);

  for (const refundLineItem of refundLineItems) {
    if (!shouldRestockRefundLine(refundLineItem)) {
      continue;
    }

    const lineItem = refundLineItem.line_item;
    const restockQty = Number(refundLineItem.quantity) || 0;

    if (!lineItem || restockQty <= 0) {
      continue;
    }

    const productKey = productKeyById.get(String(lineItem.product_id));
    if (!productKey) {
      continue;
    }

    try {
      const variantTitle = resolveVariantTitle(lineItem);
      const recipeLines = saleRecipeForProduct(productKey, variantTitle, restockQty);
      allLines.push(...recipeLines);
      items.push({
        productKey,
        productTitle: lineItem.title || lineItem.name,
        variantTitle,
        quantity: restockQty,
        restockType: refundLineItem.restock_type,
        components: recipeLines,
      });
    } catch (error) {
      items.push({
        productKey,
        productTitle: lineItem.title || lineItem.name,
        variantTitle: lineItem.variant_title || null,
        quantity: restockQty,
        restockType: refundLineItem.restock_type,
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
  buildRefundRestocks,
  shouldRestockRefundLine,
};
