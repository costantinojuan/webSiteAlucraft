const { getAlertThresholds } = require("../config");
const { sendWhatsAppMessage } = require("./whatsapp");

/** @type {Map<string, number>} alertKey -> lastSentAt ms */
const recentAlerts = new Map();
const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 h per variant

function alertKey(productKey, variantTitle) {
  return `${productKey}::${variantTitle}`;
}

function shouldSendAlert(key) {
  const last = recentAlerts.get(key);
  if (!last) {
    return true;
  }
  return Date.now() - last > COOLDOWN_MS;
}

function markAlertSent(key) {
  recentAlerts.set(key, Date.now());
}

/**
 * @param {Array<{ productKey: string, productTitle: string, variantTitle: string, available: number, threshold: number }>} items
 */
function buildAlertMessage(items) {
  const lines = items.map(
    (item) => `${item.productTitle} ${item.variantTitle}: quedan ${item.available} unidades.`
  );

  return `Alerta de stock bajo en Alucraft:\n${lines.join("\n")}\nRevisar reposición.`;
}

/**
 * Check stock levels against thresholds and send one WhatsApp if needed.
 * @param {Array<{ key: string, title: string, variants: Array<{ title: string, available: number }> }>} productGroups
 */
async function checkAndSendStockAlerts(productGroups) {
  const thresholds = getAlertThresholds();
  const lowItems = [];

  for (const group of productGroups) {
    const threshold = thresholds[group.key];
    if (threshold == null || Number.isNaN(threshold)) {
      continue;
    }

    for (const variant of group.variants) {
      if (variant.available <= threshold) {
        const key = alertKey(group.key, variant.title);
        if (shouldSendAlert(key)) {
          lowItems.push({
            productKey: group.key,
            productTitle: group.title,
            variantTitle: variant.title,
            available: variant.available,
            threshold,
            alertKey: key,
          });
        }
      }
    }
  }

  if (lowItems.length === 0) {
    return { sent: false, lowCount: 0 };
  }

  const body = buildAlertMessage(lowItems);

  try {
    const result = await sendWhatsAppMessage(body);
    if (result) {
      for (const item of lowItems) {
        markAlertSent(item.alertKey);
      }
      console.log("Stock alert WhatsApp sent", {
        count: lowItems.length,
        provider: result.provider,
      });
      return { sent: true, lowCount: lowItems.length, items: lowItems, result };
    }
    return { sent: false, lowCount: lowItems.length, skipped: "whatsapp_not_configured" };
  } catch (error) {
    console.error("Failed to send stock alert WhatsApp", error);
    return { sent: false, lowCount: lowItems.length, error: error.message };
  }
}

module.exports = { checkAndSendStockAlerts, buildAlertMessage };
