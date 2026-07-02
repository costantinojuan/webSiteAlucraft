/** Normaliza nombres de color para comparación (sin acentos, minúsculas). */
function normalizeColor(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

const STRUCTURE_CODE_BY_COLOR = {
  marron: "MR",
  "negro microtexturado": "NM",
  arena: "AR",
};

const FABRIC_CODE_BY_COLOR = {
  beige: "BE",
  "gris claro": "GC",
  "gris oscuro": "GO",
  tostado: "TO",
};

function structureToCode(colorLabel) {
  const code = STRUCTURE_CODE_BY_COLOR[normalizeColor(colorLabel)];
  if (!code) {
    throw new Error(`Color de estructura desconocido: "${colorLabel}"`);
  }
  return code;
}

function fabricToCode(colorLabel) {
  const code = FABRIC_CODE_BY_COLOR[normalizeColor(colorLabel)];
  if (!code) {
    throw new Error(`Color de tela desconocido: "${colorLabel}"`);
  }
  return code;
}

function skuForStructure(kind, colorLabel) {
  const code = structureToCode(colorLabel);
  const prefixes = {
    sillon1: "EST-S1",
    sillon3: "EST-S3",
    reposera: "EST-REP",
    mesa: "MES-RAT",
  };
  const prefix = prefixes[kind];
  if (!prefix) {
    throw new Error(`Tipo de estructura desconocido: ${kind}`);
  }
  return `${prefix}-${code}`;
}

function skuForFabric(kind, colorLabel) {
  const code = fabricToCode(colorLabel);
  const prefixes = {
    baseSillon1: "ALM-B1-658010",
    respaldoSillon1: "ALM-R1-654412",
    baseSillon3: "ALM-B3-1848010",
    respaldoSillon3: "ALM-R3-924412",
    reposera: "ALM-REP-1957010",
  };
  const prefix = prefixes[kind];
  if (!prefix) {
    throw new Error(`Tipo de almohadón desconocido: ${kind}`);
  }
  return `${prefix}-${code}`;
}

/** Cajas: un SKU por tipo de producto (sin variante de color). */
const BOX_SKU_BY_PRODUCT = {
  sillon1: "CAJA-S1",
  sillon3: "CAJA-S3",
  mesa: "CAJA-MES",
  reposera: "CAJA-REP",
};

function skuForBox(productKey) {
  const sku = BOX_SKU_BY_PRODUCT[productKey];
  if (!sku) {
    throw new Error(`Tipo de caja desconocido: ${productKey}`);
  }
  return sku;
}

/** Todos los SKUs esperados de componentes (3 estructuras × 4 + 4 telas × 5 + 4 cajas = 36). */
function allExpectedComponentSkus() {
  const structureColors = ["Marrón", "Negro Microtexturado", "Arena"];
  const fabricColors = ["Beige", "Gris Claro", "Gris Oscuro", "Tostado"];
  const skus = [];

  for (const color of structureColors) {
    skus.push(skuForStructure("sillon1", color));
    skus.push(skuForStructure("sillon3", color));
    skus.push(skuForStructure("reposera", color));
    skus.push(skuForStructure("mesa", color));
  }

  for (const color of fabricColors) {
    skus.push(skuForFabric("baseSillon1", color));
    skus.push(skuForFabric("respaldoSillon1", color));
    skus.push(skuForFabric("baseSillon3", color));
    skus.push(skuForFabric("respaldoSillon3", color));
    skus.push(skuForFabric("reposera", color));
  }

  for (const productKey of Object.keys(BOX_SKU_BY_PRODUCT)) {
    skus.push(skuForBox(productKey));
  }

  return skus;
}

module.exports = {
  normalizeColor,
  structureToCode,
  fabricToCode,
  skuForStructure,
  skuForFabric,
  skuForBox,
  BOX_SKU_BY_PRODUCT,
  allExpectedComponentSkus,
  STRUCTURE_CODE_BY_COLOR,
  FABRIC_CODE_BY_COLOR,
};
