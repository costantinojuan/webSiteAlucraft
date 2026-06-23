/** Best-effort dedup de webhooks orders/paid (instancias warm en Vercel). */
const processed = new Map();
const MAX_ENTRIES = 500;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function orderKey(shop, orderId) {
  return `${shop || "unknown"}:${orderId}`;
}

function wasOrderProcessed(shop, orderId) {
  if (!orderId) {
    return false;
  }

  const key = orderKey(shop, orderId);
  const at = processed.get(key);
  if (!at) {
    return false;
  }

  if (Date.now() - at > TTL_MS) {
    processed.delete(key);
    return false;
  }

  return true;
}

function markOrderProcessed(shop, orderId) {
  if (!orderId) {
    return;
  }

  processed.set(orderKey(shop, orderId), Date.now());

  if (processed.size > MAX_ENTRIES) {
    const oldest = processed.keys().next().value;
    processed.delete(oldest);
  }
}

module.exports = { wasOrderProcessed, markOrderProcessed };
