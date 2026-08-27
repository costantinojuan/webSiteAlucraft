const { PIECES, paintedSku, paintWipSku } = require("./bom/pieces");
const { loadComponentStock } = require("./bom/loadComponentStock");

const PRODUCT_SHORT = {
  mesa: "mesa",
  sillon1: "S1",
  sillon3: "S3",
  reposera: "reposera",
};

const PIECE_GROUPS = [
  { id: "mesa", title: "Mesa ratona", keys: ["lat_mes", "tab_mes"] },
  {
    id: "sillon",
    title: "Sillones",
    keys: ["lat_sil_rec", "lat_sil_inc", "bas_s1", "res_s1", "bas_s3", "res_s3"],
  },
  { id: "reposera", title: "Reposera", keys: ["bas_rep", "lat_rep", "acc_rep"] },
];

function pieceUseLabel(piece) {
  const uses = Object.entries(piece.qtyByProduct).map(([productKey, qty]) => {
    const name = PRODUCT_SHORT[productKey] || productKey;
    return `${qty} por ${name}`;
  });
  if (piece.sofaStyle) {
    uses.push(piece.sofaStyle);
  }
  return uses.join(" · ");
}

function snapshotFromStock(stockBySku) {
  return PIECES.map((piece) => ({
    key: piece.key,
    label: piece.label,
    sku: piece.sku,
    use: pieceUseLabel(piece),
    sofaStyle: piece.sofaStyle || null,
    natural: stockBySku.get(piece.sku) ?? 0,
    wipNm: stockBySku.get(paintWipSku(piece.sku, "NM")) ?? 0,
    wipAr: stockBySku.get(paintWipSku(piece.sku, "AR")) ?? 0,
    paintedNm: stockBySku.get(paintedSku(piece.sku, "NM")) ?? 0,
    paintedAr: stockBySku.get(paintedSku(piece.sku, "AR")) ?? 0,
    skuNm: paintedSku(piece.sku, "NM"),
    skuAr: paintedSku(piece.sku, "AR"),
    skuWipNm: paintWipSku(piece.sku, "NM"),
    skuWipAr: paintWipSku(piece.sku, "AR"),
  }));
}

function codesCatalog() {
  return snapshotFromStock(new Map());
}

function groupedPieces(rows) {
  const byKey = new Map(rows.map((row) => [row.key, row]));
  return PIECE_GROUPS.map((group) => ({
    ...group,
    pieces: group.keys.map((key) => byKey.get(key)).filter(Boolean),
  }));
}

async function getPaintWorkshopStock(config) {
  const { stockBySku } = await loadComponentStock(config);
  return snapshotFromStock(stockBySku);
}

module.exports = {
  PIECE_GROUPS,
  pieceUseLabel,
  codesCatalog,
  snapshotFromStock,
  groupedPieces,
  getPaintWorkshopStock,
};
