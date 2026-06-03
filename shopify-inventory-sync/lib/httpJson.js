async function readJsonResponse(response, label) {
  const text = await response.text();
  const trimmed = text.trim();

  if (trimmed.startsWith("<!") || trimmed.startsWith("<html")) {
    const oauthError = trimmed.match(/Oauth error ([^<]+)/i);
    const hint = oauthError
      ? `Shopify dice: "${oauthError[1].trim()}". `
      : "";
    throw new Error(
      `${label} devolvió HTML (status ${response.status}). ${hint}` +
        "Copiá de nuevo Client ID y Secreto desde Partner → Configuración → Credenciales (app ACTUAL). " +
        "Si recreaste la app, las credenciales viejas ya no sirven."
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `${label} respuesta inválida (status ${response.status}): ${trimmed.slice(0, 200)}`
    );
  }
}

module.exports = { readJsonResponse };
