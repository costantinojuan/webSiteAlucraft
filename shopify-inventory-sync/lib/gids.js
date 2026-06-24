/** @param {string|number} id Numeric Shopify ID or existing GID */
function toGid(resource, id) {
  const raw = String(id).trim();
  if (raw.startsWith("gid://")) {
    return raw;
  }
  return `gid://shopify/${resource}/${raw}`;
}

function variantGid(variantId) {
  return toGid("ProductVariant", variantId);
}

function productGid(productId) {
  return toGid("Product", productId);
}

function locationGid(locationId) {
  return toGid("Location", locationId);
}

function orderGid(orderId) {
  return toGid("Order", orderId);
}

function inventoryItemGid(inventoryItemId) {
  return toGid("InventoryItem", inventoryItemId);
}

/** @returns {string} Numeric ID from a Shopify GID */
function parseNumericId(gid) {
  const parts = String(gid).split("/");
  return parts[parts.length - 1];
}

module.exports = {
  variantGid,
  productGid,
  locationGid,
  orderGid,
  inventoryItemGid,
  parseNumericId,
};
