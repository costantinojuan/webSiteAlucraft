#!/usr/bin/env node
/**
 * Fija Root Directory del proyecto Vercel enlazado a shopify-inventory-sync.
 * Hace falta porque Git clona el monorepo completo; el CLI sube solo esta carpeta.
 * No imprime tokens.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

const PROJECT_ID = "prj_qw3gwwt361hQuTAlBIu7JmWJy2rS";
const TEAM_ID = "team_mp3sBhBb2FhOpy8xRqHDyyO6";
const ROOT = "shopify-inventory-sync";

function loadToken() {
  if (process.env.VERCEL_TOKEN?.trim()) {
    return process.env.VERCEL_TOKEN.trim();
  }
  const candidates = [
    path.join(os.homedir(), "Library/Application Support/com.vercel.cli/auth.json"),
    path.join(os.homedir(), ".local/share/com.vercel.cli/auth.json"),
    path.join(os.homedir(), ".config/vercel/auth.json"),
    path.join(os.homedir(), ".vercel/auth.json"),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) {
      continue;
    }
    try {
      const json = JSON.parse(fs.readFileSync(file, "utf8"));
      const token = json.token || json.accessToken || json.authToken;
      if (token) {
        return token;
      }
    } catch {
      // next
    }
  }
  throw new Error("No encontré token de Vercel CLI. Corré: npx vercel login");
}

async function main() {
  const token = loadToken();
  const url = `https://api.vercel.com/v9/projects/${PROJECT_ID}?teamId=${encodeURIComponent(TEAM_ID)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rootDirectory: ROOT }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  if (!res.ok) {
    const msg = json.error?.message || json.error?.code || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  console.log("Root Directory:", json.rootDirectory || ROOT);
}

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});
