const { structureToCode, normalizeColor } = require("./colors");

/**
 * Piezas de estructura para pintar.
 * sku = código natural (sin color). Pintado = `${sku}-NM|AR`. En pintura = `${sku}-PINT-NM|AR`.
 */
const PIECES = [
  {
    key: "lat_mes",
    sku: "LAT-MES",
    label: "Lateral mesa",
    shopifyTitle: "Pieza Lateral mesa",
    qtyByProduct: { mesa: 2 },
  },
  {
    key: "tab_mes",
    sku: "TAB-MES",
    label: "Tabla mesa",
    shopifyTitle: "Pieza Tabla mesa",
    qtyByProduct: { mesa: 1 },
  },
  {
    key: "bas_s1",
    sku: "BAS-S1",
    label: "Base 1 cuerpo",
    shopifyTitle: "Pieza Base 1 cuerpo",
    qtyByProduct: { sillon1: 1 },
  },
  {
    key: "res_s1",
    sku: "RES-S1",
    label: "Respaldo 1 cuerpo",
    shopifyTitle: "Pieza Respaldo 1 cuerpo",
    qtyByProduct: { sillon1: 1 },
  },
  {
    key: "lat_sil_rec",
    sku: "LAT-SIL-REC",
    label: "Lateral sillón recto",
    shopifyTitle: "Pieza Lateral sillón recto",
    qtyByProduct: { sillon1: 2, sillon3: 2 },
    sofaStyle: "recto",
  },
  {
    key: "lat_sil_inc",
    sku: "LAT-SIL-INC",
    label: "Lateral sillón inclinado",
    shopifyTitle: "Pieza Lateral sillón inclinado",
    qtyByProduct: { sillon1: 2, sillon3: 2 },
    sofaStyle: "inclinado",
  },
  {
    key: "bas_s3",
    sku: "BAS-S3",
    label: "Base 3 cuerpos",
    shopifyTitle: "Pieza Base 3 cuerpos",
    qtyByProduct: { sillon3: 1 },
  },
  {
    key: "res_s3",
    sku: "RES-S3",
    label: "Respaldo 3 cuerpos",
    shopifyTitle: "Pieza Respaldo 3 cuerpos",
    qtyByProduct: { sillon3: 1 },
  },
  {
    key: "bas_rep",
    sku: "BAS-REP",
    label: "Base reposera",
    shopifyTitle: "Pieza Base reposera",
    qtyByProduct: { reposera: 1 },
  },
  {
    key: "res_rep",
    sku: "RES-REP",
    label: "Respaldo reposera",
    shopifyTitle: "Pieza Respaldo reposera",
    qtyByProduct: { reposera: 1 },
  },
  {
    key: "lat_rep",
    sku: "LAT-REP",
    label: "Lateral reposera",
    shopifyTitle: "Pieza Lateral reposera",
    qtyByProduct: { reposera: 2 },
  },
  {
    key: "acc_rep",
    sku: "ACC-REP",
    label: "Accesorio reposera",
    shopifyTitle: "Pieza Accesorio reposera",
    qtyByProduct: { reposera: 1 },
  },
];

const PIECE_BY_KEY = new Map(PIECES.map((p) => [p.key, p]));

function paintedSku(pieceSku, colorLabelOrCode) {
  const code =
    colorLabelOrCode === "NM" || colorLabelOrCode === "AR"
      ? colorLabelOrCode
      : structureToCode(colorLabelOrCode);
  return `${pieceSku}-${code}`;
}

function paintWipSku(pieceSku, colorLabelOrCode) {
  const code =
    colorLabelOrCode === "NM" || colorLabelOrCode === "AR"
      ? colorLabelOrCode
      : structureToCode(colorLabelOrCode);
  return `${pieceSku}-PINT-${code}`;
}

function skuForPieceVariant(pieceKey, variantTitle) {
  const piece = PIECE_BY_KEY.get(pieceKey);
  if (!piece) {
    throw new Error(`Pieza desconocida: ${pieceKey}`);
  }

  const title = normalizeColor(variantTitle);

  if (title === "natural") {
    return piece.sku;
  }

  const isWip = title.includes("pintura") || title.includes("en pintura");
  const isNm = title.includes("nm") || title.includes("negro");
  const isAr = title.includes("arena") || /(^|[\s·-])ar$/.test(title) || title.endsWith(" ar");

  if (isWip && isNm) {
    return paintWipSku(piece.sku, "NM");
  }
  if (isWip && isAr) {
    return paintWipSku(piece.sku, "AR");
  }
  if (title === "pintura nm") {
    return paintWipSku(piece.sku, "NM");
  }
  if (title === "pintura ar") {
    return paintWipSku(piece.sku, "AR");
  }

  return paintedSku(piece.sku, variantTitle);
}

function pieceLinesForProduct(productKey, structureColor, sofaStyle = null) {
  const lines = [];
  for (const piece of PIECES) {
    const qty = piece.qtyByProduct[productKey];
    if (!qty) continue;
    if (piece.sofaStyle && piece.sofaStyle !== sofaStyle) continue;
    lines.push({
      sku: paintedSku(piece.sku, structureColor),
      qty,
      label: `${piece.label} (${structureColor})`,
    });
  }
  return lines;
}

function allPieceSkus() {
  const skus = [];
  for (const piece of PIECES) {
    skus.push(piece.sku);
    skus.push(paintWipSku(piece.sku, "NM"));
    skus.push(paintWipSku(piece.sku, "AR"));
    skus.push(paintedSku(piece.sku, "NM"));
    skus.push(paintedSku(piece.sku, "AR"));
  }
  return skus;
}

function isCushionSku(sku) {
  return String(sku).startsWith("ALM-");
}

function isPackagingSku(sku) {
  const value = String(sku);
  return value.startsWith("CAJA-") || value === "LLAVE-ALLEN";
}

function isPaintedPieceSku(sku) {
  const value = String(sku);
  if (isCushionSku(value) || isPackagingSku(value)) return false;
  if (value.includes("-PINT-")) return false;
  return /-(NM|AR)$/.test(value);
}

function foldTitle(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function matchPieceProduct(title) {
  const normalized = foldTitle(title);
  if (!normalized.startsWith("pieza ")) {
    return null;
  }
  return PIECES.find((piece) => foldTitle(piece.shopifyTitle) === normalized) || null;
}

module.exports = {
  PIECES,
  PIECE_BY_KEY,
  paintedSku,
  paintWipSku,
  skuForPieceVariant,
  pieceLinesForProduct,
  allPieceSkus,
  isCushionSku,
  isPackagingSku,
  isPaintedPieceSku,
  matchPieceProduct,
};
