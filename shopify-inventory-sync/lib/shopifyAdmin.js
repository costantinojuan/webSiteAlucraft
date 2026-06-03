const { SHOPIFY_API_VERSION } = require("./apiVersion");
const { getStoreDomain } = require("./config");
const { getAccessToken } = require("./accessToken");
const { productGid, locationGid, parseNumericId } = require("./gids");
const { readJsonResponse } = require("./httpJson");

function graphqlUrl() {
  const version = process.env.SHOPIFY_API_VERSION || SHOPIFY_API_VERSION;
  return `https://${getStoreDomain()}/admin/api/${version}/graphql.json`;
}

async function shopifyGraphQL(query, variables = {}) {
  const accessToken = await getAccessToken();
  const response = await fetch(graphqlUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await readJsonResponse(response, "GraphQL Admin API");

  if (!response.ok) {
    const error = new Error(`Shopify GraphQL HTTP ${response.status}: ${JSON.stringify(payload)}`);
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

const PRODUCT_VARIANTS_QUERY = `
  query ProductVariants($id: ID!) {
    product(id: $id) {
      id
      title
      variants(first: 100) {
        nodes {
          id
          title
          inventoryItem { id }
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

const INVENTORY_ITEM_LEVELS_QUERY = `
  query InventoryItemLevels($id: ID!) {
    inventoryItem(id: $id) {
      id
      inventoryLevels(first: 10) {
        nodes {
          location { id legacyResourceId }
          quantities(names: ["available"]) { name quantity }
        }
      }
    }
  }
`;

const INVENTORY_SET_QUANTITIES_MUTATION = `
  mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
    inventorySetQuantities(input: $input) {
      inventoryAdjustmentGroup { createdAt reason }
      userErrors { field message code }
    }
  }
`;

async function getProductWithVariants(numericProductId) {
  const data = await shopifyGraphQL(PRODUCT_VARIANTS_QUERY, {
    id: productGid(numericProductId),
  });

  if (!data.product) {
    throw new Error(`Product not found: ${numericProductId}`);
  }

  return {
    productGid: data.product.id,
    productId: parseNumericId(data.product.id),
    title: data.product.title,
    variants: (data.product.variants?.nodes || []).map((v) => ({
      variantGid: v.id,
      variantId: parseNumericId(v.id),
      title: (v.title || "Default Title").trim(),
      inventoryItemGid: v.inventoryItem?.id,
    })),
  };
}

/**
 * Resolves location numeric ID from env or first inventory level on an item.
 */
async function resolveLocationId(preferredLocationId, sampleInventoryItemGid) {
  if (preferredLocationId) {
    return preferredLocationId;
  }

  const data = await shopifyGraphQL(INVENTORY_ITEM_LEVELS_QUERY, {
    id: sampleInventoryItemGid,
  });

  const levels = data.inventoryItem?.inventoryLevels?.nodes || [];
  if (levels.length === 0) {
    throw new Error(
      "No se pudo detectar LOCATION_ID automáticamente. " +
        "Agregá LOCATION_ID en Vercel o activá el scope read_locations en la app."
    );
  }

  const primary = levels[0];
  const numeric =
    primary.location?.legacyResourceId || parseNumericId(primary.location?.id);

  return String(numeric);
}

async function getAvailableQuantities(inventoryItemGids, locationId) {
  const data = await shopifyGraphQL(INVENTORY_LEVELS_QUERY, {
    ids: inventoryItemGids,
    locationId: locationGid(locationId),
  });

  const levels = new Map();

  for (const node of data.nodes || []) {
    if (!node?.id) continue;
    const availableEntry = node.inventoryLevel?.quantities?.find((q) => q.name === "available");
    levels.set(node.id, Number(availableEntry?.quantity) || 0);
  }

  for (const gid of inventoryItemGids) {
    if (!levels.has(gid)) {
      levels.set(gid, 0);
    }
  }

  return levels;
}

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
  getProductWithVariants,
  resolveLocationId,
  getAvailableQuantities,
  setAvailableQuantity,
};
