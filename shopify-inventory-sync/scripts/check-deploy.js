#!/usr/bin/env node
/**
 * Comprueba que la app de inventario responde en Vercel (C1).
 * Uso: node scripts/check-deploy.js https://TU-PROYECTO.vercel.app
 *      APP_BASE_URL=https://... npm run check-deploy
 */

const HISTORIC = "https://alucraft-inventory-sync.vercel.app";

function parseArgs(argv) {
  const url = argv.find((a) => a.startsWith("http")) || process.env.APP_BASE_URL?.trim();
  return { url: url ? url.replace(/\/$/, "") : null };
}

async function probe(base) {
  const healthUrl = `${base}/health`;
  const started = Date.now();
  try {
    const res = await fetch(healthUrl, { redirect: "manual" });
    const text = await res.text();
    let body = text.slice(0, 240);
    try {
      body = JSON.stringify(JSON.parse(text));
    } catch {
      body = text.replace(/\s+/g, " ").trim().slice(0, 240);
    }
    return { healthUrl, status: res.status, body, ms: Date.now() - started };
  } catch (error) {
    return { healthUrl, status: 0, body: error.message, ms: Date.now() - started };
  }
}

function isHealthy(result) {
  if (result.status !== 200) {
    return false;
  }
  try {
    const json = JSON.parse(result.body);
    return json.ok === true;
  } catch {
    return false;
  }
}

async function main() {
  const { url } = parseArgs(process.argv.slice(2));

  if (!url) {
    console.log("Uso: npm run check-deploy -- https://TU-PROYECTO.vercel.app");
    console.log("o    APP_BASE_URL=https://... npm run check-deploy");
    console.log("\nProbando URL histórica (solo diagnóstico):", HISTORIC);
  }

  const target = url || HISTORIC;
  const result = await probe(target);
  console.log("GET", result.healthUrl);
  console.log("HTTP", result.status, `(${result.ms} ms)`);
  console.log(result.body);

  if (isHealthy(result)) {
    console.log("\nC1 deploy: OK. Siguiente: npm run list-webhooks");
    return;
  }

  console.log("\nC1 deploy: FALLA. El panel y los webhooks no van a esta URL.");
  if (!url) {
    console.log("Recreá el proyecto en Vercel (Root Directory: shopify-inventory-sync) y volvé a correr este comando con la URL nueva.");
  }
  process.exitCode = 2;
}

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});
