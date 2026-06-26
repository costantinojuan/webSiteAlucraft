const INVENTORY_SYNC_TAG = "alucraft-inventory-synced";

function orderHasSyncTag(order) {
  const tags = order.tags;
  if (Array.isArray(tags)) {
    return tags.includes(INVENTORY_SYNC_TAG);
  }
  if (typeof tags === "string") {
    return tags.split(",").map((t) => t.trim()).includes(INVENTORY_SYNC_TAG);
  }
  return false;
}

const TAGS_ADD_MUTATION = `
  mutation TagsAdd($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      node { ... on Order { id tags } }
      userErrors { field message }
    }
  }
`;

const ORDER_TAGS_QUERY = `
  query OrderTags($id: ID!) {
    order(id: $id) {
      id
      name
      tags
    }
  }
`;

async function markOrderInventorySynced(orderId) {
  const { shopifyGraphQL } = require("./shopifyAdmin");
  const { orderGid } = require("./gids");

  const data = await shopifyGraphQL(TAGS_ADD_MUTATION, {
    id: orderGid(orderId),
    tags: [INVENTORY_SYNC_TAG],
  });

  const errors = data.tagsAdd?.userErrors || [];
  if (errors.length > 0) {
    const error = new Error(`tagsAdd failed: ${errors.map((e) => e.message).join("; ")}`);
    error.userErrors = errors;
    throw error;
  }

  return true;
}

async function fetchOrderTags(orderId) {
  const { shopifyGraphQL } = require("./shopifyAdmin");
  const { orderGid } = require("./gids");

  const data = await shopifyGraphQL(ORDER_TAGS_QUERY, {
    id: orderGid(orderId),
  });

  if (!data.order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  return {
    id: orderId,
    name: data.order.name,
    tags: data.order.tags || [],
  };
}

module.exports = {
  INVENTORY_SYNC_TAG,
  orderHasSyncTag,
  markOrderInventorySynced,
  fetchOrderTags,
};
