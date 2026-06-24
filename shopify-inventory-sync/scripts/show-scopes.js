#!/usr/bin/env node
/** Muestra los scopes activos del token (client credentials). */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { getAuthConfig } = require("../lib/config");
const { readJsonResponse } = require("../lib/httpJson");

async function main() {
  const auth = getAuthConfig();
  if (auth.mode !== "client_credentials") {
    console.log("Modo static token — scopes no disponibles por API.");
    return;
  }

  const res = await fetch(`https://${auth.storeDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: auth.clientId,
      client_secret: auth.clientSecret,
    }),
  });

  const payload = await readJsonResponse(res, "token");
  console.log("\n=== Scopes activos de tu app ===");
  console.log(payload.scope || "(vacío)");
  const scope = String(payload.scope || "");
  console.log("\n¿Tiene write_orders?", scope.includes("write_orders") ? "SÍ" : "NO");
  console.log("¿Tiene read_orders?", scope.includes("read_orders") ? "SÍ" : "NO");
  console.log("");
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
