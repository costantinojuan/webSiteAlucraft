/** Evita procesar dos veces el mismo webhook (reintentos de Shopify). */
const processedWebhookIds = new Map();
const MAX_ENTRIES = 500;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function wasWebhookProcessed(webhookId) {
  if (!webhookId) {
    return false;
  }

  const at = processedWebhookIds.get(webhookId);
  if (!at) {
    return false;
  }

  if (Date.now() - at > TTL_MS) {
    processedWebhookIds.delete(webhookId);
    return false;
  }

  return true;
}

function markWebhookProcessed(webhookId) {
  if (!webhookId) {
    return;
  }

  processedWebhookIds.set(webhookId, Date.now());

  if (processedWebhookIds.size > MAX_ENTRIES) {
    const oldest = processedWebhookIds.keys().next().value;
    processedWebhookIds.delete(oldest);
  }
}

module.exports = { wasWebhookProcessed, markWebhookProcessed };
