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
};

const FABRIC_CODE_BY_COLOR = {
  beige: "BE",
  "gris claro": "GC",
  "gris oscuro": "GO",
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

/** Todos los SKUs esperados de componentes (23 variantes). */
function allExpectedComponentSkus() {
  const structureColors = ["Marrón", "Negro Microtexturado"];
  const fabricColors = ["Beige", "Gris Claro", "Gris Oscuro"];
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

  return skus;
}

module.exports = {
  normalizeColor,
  structureToCode,
  fabricToCode,
  skuForStructure,
  skuForFabric,
  allExpectedComponentSkus,
  STRUCTURE_CODE_BY_COLOR,
  FABRIC_CODE_BY_COLOR,
};
