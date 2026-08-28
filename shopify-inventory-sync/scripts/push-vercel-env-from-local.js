#!/usr/bin/env node
/**
 * Sube las keys de .env local al proyecto Vercel ya enlazado (`vercel link`).
 * No imprime valores. Uso: node scripts/push-vercel-env-from-local.js
 */

const { spawnSync } = require("child_process");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const SKIP = new Set(["PORT"]);
const ENV_TARGETS = "production,preview,development";

function envPayload() {
  const entries = [];
  for (const [key, raw] of Object.entries(process.env)) {
    if (!/^[A-Z][A-Z0-9_]+$/.test(key)) {
      continue;
    }
    if (SKIP.has(key)) {
      continue;
    }
    if (
      !key.startsWith("SHOPIFY_") &&
      !key.startsWith("PRODUCT_ID_") &&
      !key.startsWith("ADMIN_") &&
      !key.startsWith("ALERT_") &&
      !key.startsWith("WHATSAPP_") &&
      !key.startsWith("TWILIO_") &&
      key !== "LOCATION_ID" &&
      key !== "SESSION_SECRET" &&
      key !== "INVENTORY_SYNC_MODE"
    ) {
      continue;
    }
    const value = String(raw ?? "").trim();
    if (!value) {
      continue;
    }
    entries.push({ key, value });
  }
  return entries;
}

function addEnv(key, value) {
  const result = spawnSync(
    "npx",
    ["--yes", "vercel", "env", "add", key, ENV_TARGETS, "--yes", "--force"],
    {
      input: value,
      encoding: "utf8",
      cwd: path.join(__dirname, ".."),
    }
  );
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  const ok = result.status === 0;
  return { ok, status: result.status, hint: output.replace(/\s+/g, " ").trim().slice(0, 220) };
}

function main() {
  const entries = envPayload();
  console.log(`Keys a subir: ${entries.map((e) => e.key).join(", ") || "(ninguna)"}`);
  if (entries.length === 0) {
    throw new Error("No encontré variables en .env");
  }

  const failed = [];
  for (const entry of entries) {
    const result = addEnv(entry.key, entry.value);
    console.log(`${result.ok ? "OK" : "FAIL"} ${entry.key}`);
    if (!result.ok) {
      failed.push(`${entry.key}: ${result.hint}`);
      console.log("  ", result.hint);
    }
  }

  if (failed.length) {
    throw new Error(`Falló subir ${failed.length} variables`);
  }
  console.log(`Subidas: ${entries.length}`);
}

try {
  main();
} catch (error) {
  console.error("ERROR:", error.message);
  process.exit(1);
}
