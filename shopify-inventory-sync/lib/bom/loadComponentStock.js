const { allExpectedComponentSkus } = require("./colors");
const {
  findComponentProducts,
  expectedSkuForVariant,
  COMPONENT_PRODUCT_RULES,
} = require("./componentProducts");
const {
  fetchAllProductsCatalog,
  resolveLocationId,
  getAvailableQuantities,
} = require("../shopifyAdmin");

/**
 * Carga stock de componentes indexado por SKU.
 */
async function loadComponentStock(config) {
  const catalog = await fetchAllProductsCatalog();
  const mesaComponentProductId = process.env.PRODUCT_ID_MESA_COMPONENT?.trim() || null;

  const matched = findComponentProducts(catalog, { mesaComponentProductId });
  const missingProducts = COMPONENT_PRODUCT_RULES.filter((rule) => !matched.has(rule.key)).map(
    (rule) => rule.label
  );

  if (missingProducts.length > 0) {
    throw new Error(
      `Faltan productos componente en Shopify: ${missingProducts.join(", ")}. ` +
        "Creá los borradores o ejecutá npm run list-ids para verificar."
    );
  }

  const skuIndex = new Map();
  const inventoryItemGids = [];
  const resolvedProducts = [];

  for (const [key, { rule, product }] of matched.entries()) {
    const variants = [];

    for (const variant of product.variants) {
      if (!variant.inventoryItemGid) {
        continue;
      }

      const sku = expectedSkuForVariant(rule, variant);
      inventoryItemGids.push(variant.inventoryItemGid);

      skuIndex.set(sku, {
        sku,
        componentKey: key,
        productTitle: product.title,
        variantTitle: variant.title,
        inventoryItemGid: variant.inventoryItemGid,
        variantId: variant.variantId,
      });

      variants.push({
        title: variant.title,
        sku,
        inventoryItemGid: variant.inventoryItemGid,
      });
    }

    resolvedProducts.push({
      key,
      label: rule.label,
      productId: product.productId,
      title: product.title,
      status: product.status,
      variants,
    });
  }

  if (inventoryItemGids.length === 0) {
    throw new Error("No se encontraron variantes de componentes con inventario");
  }

  const locationId = await resolveLocationId(config.locationId, inventoryItemGids[0]);
  const levels = await getAvailableQuantities(inventoryItemGids, locationId);

  const stockBySku = new Map();
  for (const [sku, meta] of skuIndex.entries()) {
    stockBySku.set(sku, levels.get(meta.inventoryItemGid) ?? 0);
  }

  const expectedSkus = allExpectedComponentSkus();
  const missingSkus = expectedSkus.filter((sku) => !stockBySku.has(sku));

  if (missingSkus.length > 0) {
    throw new Error(
      `Faltan SKUs de componentes (${missingSkus.length}): ${missingSkus.join(", ")}. ` +
        "Asigná los SKUs en Shopify o verificá los títulos de variantes."
    );
  }

  return {
    locationId,
    stockBySku,
    skuIndex,
    resolvedProducts,
    expectedSkus,
  };
}

module.exports = { loadComponentStock };
