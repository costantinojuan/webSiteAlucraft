const { getAuthConfig } = require("./config");

/** @type {{ token: string, expiresAt: number } | null} */
let cache = null;

async function fetchClientCredentialsToken(auth) {
  const url = `https://${auth.storeDomain}/admin/oauth/access_token`;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: auth.clientId,
    client_secret: auth.clientSecret,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(
      `Shopify token request failed (${response.status}): ${JSON.stringify(payload)}`
    );
  }

  if (!payload.access_token) {
    throw new Error(`Shopify token response missing access_token: ${JSON.stringify(payload)}`);
  }

  const expiresIn = Number(payload.expires_in) || 86399;
  cache = {
    token: payload.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return cache.token;
}

/**
 * Returns a valid Admin API access token (static shpat_ or client credentials, cached 24h).
 */
async function getAccessToken() {
  const auth = getAuthConfig();

  if (auth.mode === "static") {
    return auth.accessToken;
  }

  if (cache && Date.now() < cache.expiresAt - 60_000) {
    return cache.token;
  }

  return fetchClientCredentialsToken(auth);
}

module.exports = { getAccessToken };
