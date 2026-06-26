function normalizeLineItem(lineItem) {
  if (!lineItem) {
    return null;
  }

  return {
    product_id: lineItem.product_id ?? lineItem.productId,
    variant_id: lineItem.variant_id ?? lineItem.variantId,
    title: lineItem.title || lineItem.name || lineItem.product_title,
    name: lineItem.name || lineItem.title,
    variant_title: lineItem.variant_title ?? lineItem.variantTitle,
    quantity: lineItem.quantity,
  };
}

function normalizeRefundLineItem(refundLineItem) {
  const restockType = refundLineItem.restock_type ?? refundLineItem.restockType ?? "";
  const locationId =
    refundLineItem.location_id ??
    refundLineItem.locationId ??
    refundLineItem.location?.legacyResourceId ??
    refundLineItem.location?.id;

  return {
    quantity: refundLineItem.quantity,
    restock_type: restockType,
    location_id: locationId,
    line_item: normalizeLineItem(refundLineItem.line_item ?? refundLineItem.lineItem),
  };
}

function collectRefundLineItems(source) {
  const direct = source.refund_line_items ?? source.refundLineItems;
  if (Array.isArray(direct) && direct.length > 0) {
    return direct.map(normalizeRefundLineItem);
  }

  const refunds = source.refunds;
  if (!Array.isArray(refunds) || refunds.length === 0) {
    return [];
  }

  const merged = [];
  for (const refund of refunds) {
    const items = refund.refund_line_items ?? refund.refundLineItems ?? [];
    for (const item of items) {
      merged.push(normalizeRefundLineItem(item));
    }
  }

  return merged;
}

module.exports = {
  normalizeLineItem,
  normalizeRefundLineItem,
  collectRefundLineItems,
};
