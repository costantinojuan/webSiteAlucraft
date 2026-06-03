const { SHOPIFY_API_VERSION } = require("./apiVersion");
const { getConfig } = require("./config");
const { getAccessToken } = require("./accessToken");
const { variantGid, locationGid } = require("./gids");

function graphqlUrl(config) {
  const version = config.apiVersion || SHOPIFY_API_VERSION;
  return `https://${config.storeDomain}/admin/api/${version}/graphql.json`;
}

async function shopifyGraphQL(query, variables = {}) {
  const config = getConfig();
  const accessToken = await getAccessToken();
  const response = await fetch(graphqlUrl(config), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json();

  if (!response.ok) {
    const error = new Error(
      `Shopify GraphQL HTTP ${response.status}: ${JSON.stringify(payload)}`
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  if (payload.errors?.length) {
    const error = new Error(
      `Shopify GraphQL errors: ${payload.errors.map((e) => e.message).join("; ")}`
    );
    error.graphqlErrors = payload.errors;
    throw error;
  }

  return payload.data;
}

const VARIANTS_INVENTORY_QUERY = `
  query VariantsInventoryItems($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        title
        inventoryItem {
          id
        }
      }
    }
  }
`;

const INVENTORY_LEVELS_QUERY = `
  query InventoryLevelsAtLocation($ids: [ID!]!, $locationId: ID!) {
    nodes(ids: $ids) {
      ... on InventoryItem {
        id
        inventoryLevel(locationId: $locationId) {
          quantities(names: ["available"]) {
            name
            quantity
          }
        }
      }
    }
  }
`;

const INVENTORY_SET_QUANTITIES_MUTATION = `
  mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
    inventorySetQuantities(input: $input) {
      inventoryAdjustmentGroup {
        createdAt
        reason
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

/**
 * @param {Record<string, string>} variantIdsMap e.g. { sillon1: "123", ... }
 */
async function getVariantsWithInventoryItems(variantIdsMap) {
  const ids = Object.values(variantIdsMap).map(variantGid);
  const data = await shopifyGraphQL(VARIANTS_INVENTORY_QUERY, { ids });
  const nodes = data.nodes || [];

  const byKey = {};
  const entries = Object.entries(variantIdsMap);

  for (const [key, numericVariantId] of entries) {
    const expectedGid = variantGid(numericVariantId);
    const node = nodes.find((n) => n?.id === expectedGid);

    if (!node?.inventoryItem?.id) {
      throw new Error(`Variant not found or missing inventory item: ${key} (${numericVariantId})`);
    }

    byKey[key] = {
      variantGid: node.id,
      title: node.title,
      inventoryItemGid: node.inventoryItem.id,
    };
  }

  return byKey;
}

/**
 * @param {string[]} inventoryItemGids
 * @param {string} locationId Numeric location ID from env
 * @returns {Map<string, number>} inventoryItemGid → available quantity
 */
async function getAvailableQuantities(inventoryItemGids, locationId) {
  const data = await shopifyGraphQL(INVENTORY_LEVELS_QUERY, {
    ids: inventoryItemGids,
    locationId: locationGid(locationId),
  });

  const levels = new Map();

  for (const node of data.nodes || []) {
    if (!node?.id) continue;

    const availableEntry = node.inventoryLevel?.quantities?.find((q) => q.name === "available");
    const quantity = availableEntry?.quantity ?? 0;
    levels.set(node.id, Number(quantity) || 0);
  }

  for (const gid of inventoryItemGids) {
    if (!levels.has(gid)) {
      levels.set(gid, 0);
    }
  }

  return levels;
}

/**
 * Sets absolute available quantity (sync). Uses inventorySetQuantities.
 */
async function setAvailableQuantity(inventoryItemGid, locationId, quantity) {
  const data = await shopifyGraphQL(INVENTORY_SET_QUANTITIES_MUTATION, {
    input: {
      name: "available",
      reason: "correction",
      ignoreCompareQuantity: true,
      quantities: [
        {
          inventoryItemId: inventoryItemGid,
          locationId: locationGid(locationId),
          quantity: Math.max(0, Math.floor(quantity)),
        },
      ],
    },
  });

  const result = data.inventorySetQuantities;
  const userErrors = result?.userErrors || [];

  if (userErrors.length > 0) {
    const error = new Error(
      `inventorySetQuantities failed: ${userErrors.map((e) => e.message).join("; ")}`
    );
    error.userErrors = userErrors;
    throw error;
  }

  return {
    inventoryItemGid,
    quantity: Math.max(0, Math.floor(quantity)),
    adjustmentGroup: result?.inventoryAdjustmentGroup ?? null,
  };
}

module.exports = {
  SHOPIFY_API_VERSION,
  shopifyGraphQL,
  getVariantsWithInventoryItems,
  getAvailableQuantities,
  setAvailableQuantity,
};
