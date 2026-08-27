#!/usr/bin/env node
/**
 * Restaura la opción Respaldo (Recto / Inclinado) en Sillón 1, Sillón 3 y Juego.
 * No cambia product IDs. Copia el precio de cada combinación Color+Tela a Inclinado.
 *
 * Uso: node scripts/add-sofa-style-option.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { getSyncConfig } = require("../lib/config");
const { shopifyGraphQL } = require("../lib/shopifyAdmin");
const { productGid } = require("../lib/gids");

const OPTION_NAME = "Respaldo";
const STYLE_VALUES = ["Recto", "Inclinado"];

const PRODUCT_QUERY = `
  query ProductOptions($id: ID!) {
    product(id: $id) {
      id
      title
      options { name values }
      variants(first: 50) {
        nodes {
          id
          title
          price
          selectedOptions { name value }
        }
      }
    }
  }
`;

const OPTIONS_CREATE = `
  mutation AddRespaldoOption($productId: ID!, $options: [OptionCreateInput!]!, $variantStrategy: ProductOptionCreateVariantStrategy) {
    productOptionsCreate(productId: $productId, options: $options, variantStrategy: $variantStrategy) {
      userErrors { field message code }
      product {
        id
        title
        options { name values }
        variants(first: 50) {
          nodes {
            id
            title
            price
            selectedOptions { name value }
          }
        }
      }
    }
  }
`;

const VARIANT_BULK_UPDATE = `
  mutation UpdateVariantPrices($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      userErrors { field message }
      productVariants { id title price }
    }
  }
`;

function optionValue(variant, optionName) {
  return variant.selectedOptions.find((o) => o.name === optionName)?.value || "";
}

function colorCushionKey(variant) {
  return `${optionValue(variant, "Color")} / ${optionValue(variant, "Almohadones")}`;
}

async function ensureStyleOption(productId) {
  const data = await shopifyGraphQL(PRODUCT_QUERY, { id: productGid(productId) });
  const product = data.product;
  if (!product) {
    throw new Error(`Producto no encontrado: ${productId}`);
  }

  const hasOption = (product.options || []).some((o) => o.name === OPTION_NAME);
  if (hasOption) {
    console.log(`OK     ${product.title} ya tiene opción ${OPTION_NAME}`);
    return product;
  }

  const priceByCombo = new Map();
  for (const variant of product.variants.nodes) {
    priceByCombo.set(colorCushionKey(variant), variant.price);
  }

  const created = await shopifyGraphQL(OPTIONS_CREATE, {
    productId: productGid(productId),
    options: [
      {
        name: OPTION_NAME,
        values: STYLE_VALUES.map((name) => ({ name })),
      },
    ],
    variantStrategy: "CREATE",
  });

  const errors = created.productOptionsCreate?.userErrors || [];
  if (errors.length > 0) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }

  const updated = created.productOptionsCreate.product;
  const priceFixes = [];

  for (const variant of updated.variants.nodes) {
    const combo = colorCushionKey(variant);
    const expectedPrice = priceByCombo.get(combo);
    if (expectedPrice != null && String(variant.price) !== String(expectedPrice)) {
      priceFixes.push({ id: variant.id, price: expectedPrice });
    }
  }

  if (priceFixes.length > 0) {
    const result = await shopifyGraphQL(VARIANT_BULK_UPDATE, {
      productId: productGid(productId),
      variants: priceFixes,
    });
    const updateErrors = result.productVariantsBulkUpdate?.userErrors || [];
    if (updateErrors.length > 0) {
      throw new Error(updateErrors.map((e) => e.message).join("; "));
    }
  }

  console.log(`CREADO ${updated.title}`);
  for (const variant of updated.variants.nodes) {
    console.log(`       ${variant.title}  $${variant.price}`);
  }
  return updated;
}

async function main() {
  const { productIds } = getSyncConfig();
  for (const key of ["sillon1", "sillon3", "juego"]) {
    await ensureStyleOption(productIds[key]);
  }
}

main().catch((error) => {
  console.error("\nERROR:", error.message || error);
  process.exit(1);
});
