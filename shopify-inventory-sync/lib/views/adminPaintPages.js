const { groupedPieces } = require("../paintWorkshop");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function qtyInput(name, max, { disabled = false } = {}) {
  const cap = Math.max(0, Number(max) || 0);
  return `<input
    type="number"
    name="${escapeHtml(name)}"
    min="0"
    max="${cap}"
    step="1"
    value="0"
    ${disabled || cap === 0 ? "disabled" : ""}
    ${cap === 0 ? "" : `aria-label="Cantidad, máximo ${cap}"`}
  >`;
}

function sendRows(groups) {
  return groups
    .map((group) => {
      const rows = group.pieces
        .map(
          (piece) => `
      <tr data-piece="${escapeHtml(piece.key)}" data-natural="${piece.natural}" data-sku="${escapeHtml(piece.sku)}" data-sku-nm="${escapeHtml(piece.skuNm)}" data-sku-ar="${escapeHtml(piece.skuAr)}">
        <th>
          <strong>${escapeHtml(piece.label)}</strong>
          <span class="paint-use">${escapeHtml(piece.use)}</span>
        </th>
        <td><code>${escapeHtml(piece.sku)}</code></td>
        <td class="num">${piece.natural}</td>
        <td class="qty">${qtyInput(`${piece.key}-NM`, piece.natural)}</td>
        <td class="qty">${qtyInput(`${piece.key}-AR`, piece.natural)}</td>
      </tr>`
        )
        .join("");

      return `
      <tbody>
        <tr class="paint-group"><th colspan="5">${escapeHtml(group.title)}</th></tr>
        ${rows}
      </tbody>`;
    })
    .join("");
}

function receiveRows(groups) {
  return groups
    .map((group) => {
      const rows = group.pieces
        .map(
          (piece) => `
      <tr data-piece="${escapeHtml(piece.key)}" data-sku="${escapeHtml(piece.sku)}" data-sku-nm="${escapeHtml(piece.skuNm)}" data-sku-ar="${escapeHtml(piece.skuAr)}">
        <th>
          <strong>${escapeHtml(piece.label)}</strong>
          <span class="paint-use">${escapeHtml(piece.use)}</span>
        </th>
        <td><code>${escapeHtml(piece.skuNm)}</code></td>
        <td class="num">${piece.wipNm}</td>
        <td class="qty">${qtyInput(`${piece.key}-NM`, piece.wipNm)}</td>
        <td><code>${escapeHtml(piece.skuAr)}</code></td>
        <td class="num">${piece.wipAr}</td>
        <td class="qty">${qtyInput(`${piece.key}-AR`, piece.wipAr)}</td>
      </tr>`
        )
        .join("");

      return `
      <tbody>
        <tr class="paint-group"><th colspan="7">${escapeHtml(group.title)}</th></tr>
        ${rows}
      </tbody>`;
    })
    .join("");
}

function renderPaintWorkshopPanel(pieces) {
  const groups = groupedPieces(pieces);
  const naturalTotal = pieces.reduce((sum, p) => sum + p.natural, 0);
  const wipTotal = pieces.reduce((sum, p) => sum + p.wipNm + p.wipAr, 0);

  return `
  <div class="paint-toolbar no-print">
    <a class="btn btn-outline" href="/admin/pintura/codigos" target="_blank" rel="noopener">Imprimir códigos</a>
    <button type="button" class="btn btn-outline" data-paint-tab="send">Mandar a pintar</button>
    <button type="button" class="btn btn-outline" data-paint-tab="receive">Recibir pintado</button>
  </div>

  <section class="paint-board" id="paint-tab-send" data-paint-panel="send">
    <h3>Mandar a pintar</h3>
    <p>Anotá cuántas de cada pieza salen a negro (NM) y cuántas a arena (AR). El total por fila no puede pasar el Natural (${naturalTotal} u. en depósito).</p>
    <form id="paint-send-form" class="paint-table-form">
      <div class="table-scroll">
        <table class="paint-table">
          <thead>
            <tr>
              <th>Pieza</th>
              <th>Código Natural</th>
              <th>Hay</th>
              <th>A negro</th>
              <th>A arena</th>
            </tr>
          </thead>
          ${sendRows(groups)}
        </table>
      </div>
      <div class="paint-actions">
        <button type="submit" class="btn btn-outline">Mandar a pintar</button>
      </div>
    </form>
  </section>

  <section class="paint-board" id="paint-tab-receive" data-paint-panel="receive" hidden>
    <h3>Recibir pintado</h3>
    <p>Lo que está en el taller (${wipTotal} u.). Cargá lo que volvió: pasa de En pintura a Pintado, mismo código.</p>
    <form id="paint-receive-form" class="paint-table-form">
      <div class="table-scroll">
        <table class="paint-table">
          <thead>
            <tr>
              <th>Pieza</th>
              <th>Código NM</th>
              <th>En taller</th>
              <th>Vuelve negro</th>
              <th>Código AR</th>
              <th>En taller</th>
              <th>Vuelve arena</th>
            </tr>
          </thead>
          ${receiveRows(groups)}
        </table>
      </div>
      <div class="paint-actions">
        <button type="submit" class="btn btn-accent">Registrar recepción</button>
      </div>
    </form>
  </section>

  <p id="paint-status" class="paint-status" hidden></p>

  <section id="paint-order" class="paint-order" hidden>
    <div class="paint-order-bar no-print">
      <h3 id="paint-order-title">Orden</h3>
      <div class="paint-toolbar">
        <button type="button" class="btn btn-outline" id="paint-order-print">Imprimir esta orden</button>
        <a class="btn btn-outline" href="/admin#pintura" id="paint-order-reload">Actualizar stock</a>
      </div>
    </div>
    <div id="paint-order-body"></div>
  </section>`;
}

function printCodesTable(groups) {
  return groups
    .map((group) => {
      const rows = group.pieces
        .map(
          (piece) => `
        <tr>
          <th>
            <strong>${escapeHtml(piece.label)}</strong>
            <span class="print-use">${escapeHtml(piece.use)}</span>
          </th>
          <td><code>${escapeHtml(piece.sku)}</code></td>
          <td><code>${escapeHtml(piece.skuNm)}</code></td>
          <td><code>${escapeHtml(piece.skuAr)}</code></td>
        </tr>`
        )
        .join("");

      return `
      <section class="print-block">
        <h2>${escapeHtml(group.title)}</h2>
        <table class="print-table">
          <thead>
            <tr>
              <th>Pieza</th>
              <th>Natural</th>
              <th>Negro (NM)</th>
              <th>Arena (AR)</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
    })
    .join("");
}

function renderPrintCodesPage({ pieces, printedAt }) {
  const groups = groupedPieces(pieces);
  const dateLabel = printedAt || "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Códigos de piezas — Alucraft</title>
  <link rel="icon" href="/admin/static/alucraft-logo.png" type="image/png">
  <link rel="stylesheet" href="/admin/static/admin.css?v=20260828d">
</head>
<body class="print-page">
  <header class="print-head">
    <div>
      <img src="/admin/static/alucraft-logo.png" alt="Alucraft" width="40" height="40">
      <div>
        <h1>Códigos de piezas</h1>
        <p>Natural = sin pintar. Al volver, el código lleva NM (negro) o AR (arena).</p>
      </div>
    </div>
    <div class="print-meta">
      <span>${escapeHtml(dateLabel)}</span>
      <button type="button" class="btn btn-outline no-print" onclick="window.print()">Imprimir</button>
    </div>
  </header>
  ${printCodesTable(groups)}
  <p class="print-note">Laterales de sillón: recto e inclinado son piezas distintas. El respaldo de estructura es el mismo.</p>
</body>
</html>`;
}

module.exports = {
  renderPaintWorkshopPanel,
  renderPrintCodesPage,
};
