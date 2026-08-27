const { PIECE_BY_KEY, paintedSku, paintWipSku } = require("./pieces");
const { structureToCode } = require("./colors");

function resolveColorCode(color) {
  if (color === "NM" || color === "AR") {
    return color;
  }
  return structureToCode(color);
}

/**
 * Conversión 1:1 de pintura (no es una venta).
 * send: Natural −n, En pintura +n
 * receive: En pintura −n, Pintado +n
 */
function buildPaintDeltas({ pieceKey, color, qty, action }) {
  const piece = PIECE_BY_KEY.get(pieceKey);
  if (!piece) {
    throw new Error(`Pieza desconocida: ${pieceKey}`);
  }

  const quantity = Math.floor(Number(qty));
  if (!Number.isFinite(quantity) || quantity < 1) {
    throw new Error("La cantidad tiene que ser un entero mayor a 0");
  }

  if (action !== "send" && action !== "receive") {
    throw new Error(`Acción de pintura inválida: ${action}`);
  }

  const code = resolveColorCode(color);
  const natural = piece.sku;
  const wip = paintWipSku(piece.sku, code);
  const painted = paintedSku(piece.sku, code);
  const colorLabel = code === "NM" ? "Negro Microtexturado" : "Arena";

  if (action === "send") {
    return [
      {
        sku: natural,
        delta: -quantity,
        label: `${piece.label} Natural`,
      },
      {
        sku: wip,
        delta: quantity,
        label: `${piece.label} en pintura (${colorLabel})`,
      },
    ];
  }

  return [
    {
      sku: wip,
      delta: -quantity,
      label: `${piece.label} en pintura (${colorLabel})`,
    },
    {
      sku: painted,
      delta: quantity,
      label: `${piece.label} ${colorLabel}`,
    },
  ];
}

module.exports = { buildPaintDeltas };
