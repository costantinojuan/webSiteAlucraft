const { normalizeColor } = require("./colors");
const { skuForStructure, skuForFabric, skuForBox, skuForAllen } = require("./colors");

/**
 * Detecta productos componente en el catálogo por título.
 * Mesa Ratona componente = draft; la mesa terminada suele estar ACTIVE.
 */
const COMPONENT_PRODUCT_RULES = [
  {
    key: "est_s1",
    label: "Estructura Sillón 1 Cuerpo",
    match: (title) => /estructura/i.test(title) && /sill[oó]n/i.test(title) && /\b1\b/.test(title),
    variantSku: (variantTitle) => skuForStructure("sillon1", variantTitle),
    variantKind: "structure",
  },
  {
    key: "est_s3",
    label: "Estructura Sillón 3 Cuerpos",
    match: (title) => /estructura/i.test(title) && /sill[oó]n/i.test(title) && /\b3\b/.test(title),
    variantSku: (variantTitle) => skuForStructure("sillon3", variantTitle),
    variantKind: "structure",
  },
  {
    key: "est_rep",
    label: "Estructura Reposera",
    match: (title) => /estructura/i.test(title) && /reposera/i.test(title),
    variantSku: (variantTitle) => skuForStructure("reposera", variantTitle),
    variantKind: "structure",
  },
  {
    key: "alm_b1",
    label: "Almohadón Base Sillón 1",
    match: (title) => /almohad[oó]n/i.test(title) && /base/i.test(title) && /sill[oó]n/i.test(title) && /\b1\b/.test(title),
    variantSku: (variantTitle) => skuForFabric("baseSillon1", variantTitle),
    variantKind: "fabric",
  },
  {
    key: "alm_r1",
    label: "Almohadón Respaldo Sillón 1",
    match: (title) => /almohad[oó]n/i.test(title) && /respaldo/i.test(title) && /sill[oó]n/i.test(title) && /\b1\b/.test(title),
    variantSku: (variantTitle) => skuForFabric("respaldoSillon1", variantTitle),
    variantKind: "fabric",
  },
  {
    key: "alm_b3",
    label: "Almohadón Base Sillón 3",
    match: (title) => /almohad[oó]n/i.test(title) && /base/i.test(title) && /sill[oó]n/i.test(title) && /\b3\b/.test(title),
    variantSku: (variantTitle) => skuForFabric("baseSillon3", variantTitle),
    variantKind: "fabric",
  },
  {
    key: "alm_r3",
    label: "Almohadón Respaldo Sillón 3",
    match: (title) => /almohad[oó]n/i.test(title) && /respaldo/i.test(title) && /sill[oó]n/i.test(title) && /\b3\b/.test(title),
    variantSku: (variantTitle) => skuForFabric("respaldoSillon3", variantTitle),
    variantKind: "fabric",
  },
  {
    key: "alm_rep",
    label: "Almohadón Reposera",
    match: (title) => /almohad[oó]n/i.test(title) && /reposera/i.test(title),
    variantSku: (variantTitle) => skuForFabric("reposera", variantTitle),
    variantKind: "fabric",
  },
  {
    key: "mesa_comp",
    label: "Mesa Ratona (componente)",
    match: (title, status) => /mesa/i.test(title) && /ratona/i.test(title) && status === "DRAFT" && !/caja|manual/i.test(title),
    variantSku: (variantTitle) => skuForStructure("mesa", variantTitle),
    variantKind: "structure",
  },
  {
    key: "caja_s1",
    label: "Caja Sillón 1",
    match: (title) => /caja/i.test(title) && /sill[oó]n/i.test(title) && /\b1\b/.test(title),
    variantSku: () => skuForBox("sillon1"),
    variantKind: "packaging",
  },
  {
    key: "caja_s3",
    label: "Caja Sillón 3",
    match: (title) => /caja/i.test(title) && /sill[oó]n/i.test(title) && /\b3\b/.test(title),
    variantSku: () => skuForBox("sillon3"),
    variantKind: "packaging",
  },
  {
    key: "caja_mes",
    label: "Caja Mesa Ratona",
    match: (title) => /caja/i.test(title) && /mesa/i.test(title) && /ratona/i.test(title),
    variantSku: () => skuForBox("mesa"),
    variantKind: "packaging",
  },
  {
    key: "caja_rep",
    label: "Caja Reposera",
    match: (title) => /caja/i.test(title) && /reposera/i.test(title),
    variantSku: () => skuForBox("reposera"),
    variantKind: "packaging",
  },
  {
    key: "llave_allen",
    label: "Llave Allen",
    match: (title) => /llave/i.test(title) && /allen/i.test(title),
    variantSku: () => skuForAllen(),
    variantKind: "packaging",
  },
];

function findComponentProducts(catalog, options = {}) {
  const mesaComponentProductId = options.mesaComponentProductId?.trim() || null;
  const found = new Map();

  for (const product of catalog) {
    const numericId = product.productId;
    if (mesaComponentProductId && String(numericId) === String(mesaComponentProductId)) {
      const rule = COMPONENT_PRODUCT_RULES.find((r) => r.key === "mesa_comp");
      found.set("mesa_comp", { rule, product });
      continue;
    }

    for (const rule of COMPONENT_PRODUCT_RULES) {
      if (rule.key === "mesa_comp") {
        continue;
      }
      if (rule.match(product.title, product.status)) {
        if (!found.has(rule.key)) {
          found.set(rule.key, { rule, product });
        }
      }
    }
  }

  if (!found.has("mesa_comp")) {
    for (const product of catalog) {
      const rule = COMPONENT_PRODUCT_RULES.find((r) => r.key === "mesa_comp");
      if (rule.match(product.title, product.status)) {
        found.set("mesa_comp", { rule, product });
        break;
      }
    }
  }

  return found;
}

function expectedSkuForVariant(rule, variant) {
  if (variant.sku?.trim()) {
    return variant.sku.trim();
  }
  return rule.variantSku(variant.title);
}

function indexVariantsByNormalizedTitle(variants) {
  const map = new Map();
  for (const variant of variants) {
    map.set(normalizeColor(variant.title), variant);
  }
  return map;
}

module.exports = {
  COMPONENT_PRODUCT_RULES,
  findComponentProducts,
  expectedSkuForVariant,
  indexVariantsByNormalizedTitle,
};
