#!/usr/bin/env node
/**
 * Crea (o completa) los 10 productos borrador de piezas en Shopify.
 * No los publica. Stock inicial 0.
 *
 * Uso: node scripts/create-piece-products.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { getSyncConfig } = require("../lib/config");
const {
  shopifyGraphQL,
  fetchAllProductsCatalog,
  resolveLocationId,
} = require("../lib/shopifyAdmin");
const { locationGid, parseNumericId } = require("../lib/gids");
const { PIECES, skuForPieceVariant, matchPieceProduct } = require("../lib/bom/pieces");

const VARIANT_TITLES = [
  "Natural",
  "Pintura NM",
  "Pintura AR",
  "Negro Microtexturado",
  "Arena",
];

const PRODUCT_SET_MUTATION = `
  mutation CreatePieceProduct($input: ProductSetInput!, $synchronous: Boolean!) {
    productSet(input: $input, synchronous: $synchronous) {
      product {
        id
        title
        status
        variants(first: 10) {
          nodes {
            id
            title
            sku
            inventoryItem { id tracked }
          }
        }
      }
      userErrors { field message code }
    }
  }
`;

function fold(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function pieceInput(piece, locationId, existingProductId) {
  const locationGidValue = locationGid(locationId);

  return {
    ...(existingProductId ? { id: `gid://shopify/Product/${existingProductId}` } : {}),
    title: piece.shopifyTitle,
    status: "DRAFT",
    vendor: "Alucraft",
    productType: "Pieza estructura",
    tags: ["alucraft-pieza", "componente"],
    productOptions: [
      {
        name: "Estado",
        position: 1,
        values: VARIANT_TITLES.map((name) => ({ name })),
      },
    ],
    variants: VARIANT_TITLES.map((title) => {
      const sku = skuForPieceVariant(piece.key, title);
      return {
        optionValues: [{ optionName: "Estado", name: title }],
        sku,
        price: "0.00",
        inventoryPolicy: "DENY",
        taxable: false,
        inventoryItem: {
          tracked: true,
          requiresShipping: true,
          sku,
        },
        inventoryQuantities: [
          {
            locationId: locationGidValue,
            name: "available",
            quantity: 0,
          },
        ],
      };
    }),
  };
}

function variantOk(product, piece) {
  const variants = product.variants || [];
  if (variants.length < VARIANT_TITLES.length) {
    return false;
  }

  const skus = new Set(
    variants.map((v) => (v.sku || "").trim()).filter(Boolean)
  );
  return VARIANT_TITLES.every((title) => skus.has(skuForPieceVariant(piece.key, title)));
}

async function createOrUpdatePiece(piece, locationId, existing) {
  const input = pieceInput(piece, locationId, existing?.productId);
  const data = await shopifyGraphQL(PRODUCT_SET_MUTATION, {
    input,
    synchronous: true,
  });

  const result = data.productSet;
  const errors = result?.userErrors || [];
  if (errors.length > 0) {
    const detail = errors
      .map((e) => `${(e.field || []).join(".")}: ${e.message}`)
      .join("; ");
    const error = new Error(detail);
    error.userErrors = errors;
    throw error;
  }

  const product = result.product;
  return {
    action: existing ? "updated" : "created",
    productId: parseNumericId(product.id),
    title: product.title,
    status: product.status,
    variants: (product.variants?.nodes || []).map((v) => ({
      title: v.title,
      sku: v.sku,
      tracked: v.inventoryItem?.tracked,
    })),
  };
}

async function main() {
  const config = getSyncConfig();
  const catalog = await fetchAllProductsCatalog();

  const sampleItem = catalog
    .flatMap((p) => p.variants)
    .find((v) => v.inventoryItemGid);
  if (!sampleItem) {
    throw new Error("No hay un inventory item en el catálogo para detectar la ubicación.");
  }

  const locationId = await resolveLocationId(config.locationId, sampleItem.inventoryItemGid);
  console.log(`Ubicación: ${locationId}`);
  console.log(`Productos en catálogo: ${catalog.length}\n`);

  const byPieceKey = new Map();
  for (const product of catalog) {
    const match = matchPieceProduct(product.title);
    if (match && !byPieceKey.has(match.key)) {
      byPieceKey.set(match.key, product);
    }
  }

  const results = [];

  for (const piece of PIECES) {
    const existing = byPieceKey.get(piece.key);

    if (existing && variantOk(existing, piece)) {
      console.log(`OK     ${piece.shopifyTitle}  (ya existía, product ${existing.productId})`);
      results.push({ piece: piece.key, action: "skipped", productId: existing.productId });
      continue;
    }

    try {
      const result = await createOrUpdatePiece(piece, locationId, existing);
      console.log(
        `${result.action === "created" ? "CREADO" : "ACTUAL"} ${result.title}  product ${result.productId}  (${result.status})`
      );
      for (const variant of result.variants) {
        const track = variant.tracked ? "tracked" : "NO TRACK";
        console.log(`       ${String(variant.title).padEnd(22)} ${variant.sku || "(sin SKU)"}  ${track}`);
      }
      results.push({ piece: piece.key, ...result });
    } catch (error) {
      const message = error.message || String(error);
      console.error(`ERROR  ${piece.shopifyTitle}: ${message}`);

      if (/ACCESS_DENIED|write_products|not authorized|access denied/i.test(message)) {
        console.error(`
La app no tiene permiso write_products.

En Shopify Dev Dashboard → esta app → Configuration / Admin API:
  activá write_products (además de read_products y write_inventory).

Guardá, esperá unos segundos y volvé a correr:
  node scripts/create-piece-products.js
`);
        process.exit(1);
      }

      results.push({ piece: piece.key, action: "error", error: message });
    }
  }

  const failed = results.filter((r) => r.action === "error");
  console.log(
    `\nListo: ${results.filter((r) => r.action === "created").length} creados, ` +
      `${results.filter((r) => r.action === "updated").length} actualizados, ` +
      `${results.filter((r) => r.action === "skipped").length} ya estaban, ` +
      `${failed.length} con error.`
  );

  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("\nERROR:", error.message || error);
  process.exit(1);
});
