const { normalizeColor } = require("./colors");
const { skuForFabric, skuForBox, skuForAllen } = require("./colors");
const { PIECES, skuForPieceVariant, matchPieceProduct } = require("./pieces");

/**
 * Detecta productos componente en el catálogo por título.
 * Piezas de estructura: título exacto "Pieza …" (borrador, no publicado).
 */
const PIECE_PRODUCT_RULES = PIECES.map((piece) => ({
  key: piece.key,
  label: piece.label,
  match: (title) => matchPieceProduct(title)?.key === piece.key,
  variantSku: (variantTitle) => skuForPieceVariant(piece.key, variantTitle),
  variantKind: "structure",
}));

const COMPONENT_PRODUCT_RULES = [
  ...PIECE_PRODUCT_RULES,
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

function findComponentProducts(catalog) {
  const found = new Map();

  for (const product of catalog) {
    for (const rule of COMPONENT_PRODUCT_RULES) {
      if (rule.match(product.title, product.status)) {
        if (!found.has(rule.key)) {
          found.set(rule.key, { rule, product });
        }
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
