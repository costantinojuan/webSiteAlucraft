const crypto = require("crypto");

/**
 * Verifies Shopify webhook HMAC (X-Shopify-Hmac-Sha256).
 * @param {Buffer|string} rawBody
 * @param {string} hmacHeader
 * @param {string} secret
 */
function verifyShopifyWebhook(rawBody, hmacHeader, secret) {
  if (!hmacHeader || !secret) {
    return false;
  }

  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8");
  const digest = crypto.createHmac("sha256", secret).update(body).digest("base64");

  const expected = Buffer.from(digest, "utf8");
  const received = Buffer.from(hmacHeader, "utf8");

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, received);
}

module.exports = { verifyShopifyWebhook };
