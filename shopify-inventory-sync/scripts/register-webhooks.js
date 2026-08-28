#!/usr/bin/env node
/**
 * Dry-run por defecto. Crea los 3 webhooks de inventario cuando Vercel está vivo.
 *
 *   npm run register-webhooks -- --url https://TU-PROYECTO.vercel.app
 *   npm run register-webhooks -- --url https://TU-PROYECTO.vercel.app --apply
 *
 * No Recalcula stock. No toca productos. Pedí --apply explícito.
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { shopifyGraphQL } = require("../lib/shopifyAdmin");

const SUBSCRIPTIONS = [
  { topic: "ORDERS_PAID", path: "/webhooks/orders-paid" },
  { topic: "REFUNDS_CREATE", path: "/webhooks/refunds-create" },
  { topic: "ORDERS_CANCELLED", path: "/webhooks/orders-cancelled" },
];

const CREATE_MUTATION = `
  mutation WebhookCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
    webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
      webhookSubscription {
        id
        topic
        uri
      }
      userErrors { field message }
    }
  }
`;

function parseArgs(argv) {
  let url = process.env.APP_BASE_URL?.trim() || "";
  let apply = false;
  let skipHealth = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") {
      apply = true;
    } else if (arg === "--skip-health") {
      skipHealth = true;
    } else if (arg.startsWith("--url=")) {
      url = arg.slice("--url=".length);
    } else if (arg === "--url") {
      url = argv[i + 1] || "";
      i += 1;
    } else if (arg.startsWith("https://")) {
      url = arg;
    }
  }
  return { url: url.replace(/\/$/, ""), apply, skipHealth };
}

function callbackOf(node) {
  return node?.endpoint?.callbackUrl || node?.uri || "";
}

async function listExisting() {
  const data = await shopifyGraphQL(`{
    webhookSubscriptions(first: 50) {
      nodes {
        id
        topic
        endpoint {
          __typename
          ... on WebhookHttpEndpoint { callbackUrl }
        }
      }
    }
  }`);
  return data.webhookSubscriptions?.nodes || [];
}

async function assertHealthy(base) {
  const healthUrl = `${base}/health`;
  const res = await fetch(healthUrl);
  const text = await res.text();
  let ok = false;
  try {
    ok = res.status === 200 && JSON.parse(text).ok === true;
  } catch {
    ok = false;
  }
  if (!ok) {
    throw new Error(
      `Health check falló (${res.status}) en ${healthUrl}: ${text.slice(0, 180)}. ` +
        "No registro webhooks contra una URL muerta. Pasá --skip-health solo si sabés lo que hacés."
    );
  }
}

async function createSubscription(topic, callbackUrl) {
  const data = await shopifyGraphQL(CREATE_MUTATION, {
    topic,
    webhookSubscription: {
      callbackUrl,
      format: "JSON",
    },
  });
  const payload = data.webhookSubscriptionCreate;
  if (payload.userErrors?.length) {
    const msg = payload.userErrors.map((e) => e.message).join("; ");
    throw new Error(`${topic}: ${msg}`);
  }
  return payload.webhookSubscription;
}

async function main() {
  const { url, apply, skipHealth } = parseArgs(process.argv.slice(2));
  if (!url || !url.startsWith("https://")) {
    console.error("Uso: npm run register-webhooks -- --url https://TU-PROYECTO.vercel.app [--apply]");
    process.exit(1);
  }

  if (!skipHealth) {
    await assertHealthy(url);
    console.log("Health OK:", `${url}/health`);
  } else {
    console.log("Health: omitido (--skip-health)");
  }

  const existing = await listExisting();
  const existingByTopic = new Map(
    existing.map((n) => [String(n.topic).toUpperCase(), callbackOf(n)])
  );

  console.log(apply ? "\n=== APPLY ===" : "\n=== DRY-RUN (no escribe) ===");
  for (const sub of SUBSCRIPTIONS) {
    const callbackUrl = `${url}${sub.path}`;
    const already = existingByTopic.get(sub.topic);
    if (already) {
      const same = already.replace(/\/$/, "") === callbackUrl;
      console.log(
        same
          ? `  ya existe  ${sub.topic}  ${already}`
          : `  conflicto  ${sub.topic}  actual=${already}  deseado=${callbackUrl}`
      );
      if (!same && apply) {
        console.log("    (no lo piso: borrá el viejo en Shopify Admin si hay que cambiar la URL)");
      }
      continue;
    }

    console.log(`  crear      ${sub.topic}  ${callbackUrl}`);
    if (apply) {
      const created = await createSubscription(sub.topic, callbackUrl);
      console.log("    id", created?.id || created?.uri);
    }
  }

  if (!apply) {
    console.log("\nSi el dry-run está bien, repetí con --apply.");
    console.log("Copiá el mismo Signing secret de Shopify → SHOPIFY_WEBHOOK_SECRET en Vercel.");
  }
}

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});
