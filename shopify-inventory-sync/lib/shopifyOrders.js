const { shopifyGraphQL } = require("./shopifyAdmin");
const { getStoreDomain } = require("./config");
const { parseNumericId } = require("./gids");

const PENDING_ORDERS_QUERY = `
  query PendingOrders($first: Int!, $query: String!) {
    orders(first: $first, sortKey: CREATED_AT, reverse: true, query: $query) {
      nodes {
        id
        name
        legacyResourceId
        createdAt
        displayFinancialStatus
        displayFulfillmentStatus
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        customer {
          displayName
          email
        }
        lineItems(first: 15) {
          nodes {
            title
            quantity
            variant {
              title
            }
          }
        }
      }
    }
  }
`;

function formatOrderDate(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatMoney(amount, currency) {
  const value = Number(amount);
  if (Number.isNaN(value)) {
    return `${amount} ${currency || ""}`.trim();
  }
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currency || "ARS",
    }).format(value);
  } catch {
    return `${value} ${currency || ""}`.trim();
  }
}

function mapLineItems(lineItems) {
  return (lineItems?.nodes || []).map((item) => {
    const variantTitle = item.variant?.title;
    const label =
      variantTitle && variantTitle !== "Default Title"
        ? `${item.title} (${variantTitle})`
        : item.title;
    return `${label} × ${item.quantity}`;
  });
}

function orderAdminUrl(legacyResourceId) {
  return `https://${getStoreDomain()}/admin/orders/${legacyResourceId}`;
}

async function getPendingOrders(limit = 20) {
  const query = "status:open AND (fulfillment_status:unfulfilled OR fulfillment_status:partial)";

  const data = await shopifyGraphQL(PENDING_ORDERS_QUERY, {
    first: Math.min(limit, 50),
    query,
  });

  const orders = (data.orders?.nodes || []).map((order) => ({
    id: parseNumericId(order.id),
    name: order.name,
    createdAt: order.createdAt,
    createdAtFormatted: formatOrderDate(order.createdAt),
    customer: order.customer?.displayName || order.customer?.email || "Cliente sin nombre",
    financialStatus: order.displayFinancialStatus || "—",
    fulfillmentStatus: order.displayFulfillmentStatus || "—",
    total: formatMoney(
      order.totalPriceSet?.shopMoney?.amount,
      order.totalPriceSet?.shopMoney?.currencyCode
    ),
    lineItems: mapLineItems(order.lineItems),
    adminUrl: orderAdminUrl(order.legacyResourceId || parseNumericId(order.id)),
  }));

  return {
    count: orders.length,
    orders,
  };
}

module.exports = { getPendingOrders, formatOrderDate, formatMoney };
