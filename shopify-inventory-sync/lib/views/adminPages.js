function brandLogo() {
  return `<img src="/admin/static/alucraft-logo.png" alt="Alucraft" class="brand-logo" width="44" height="44">`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function layout({ title, body, extraHead = "" }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — Alucraft Admin</title>
  <link rel="stylesheet" href="/admin/static/admin.css">
  ${extraHead}
</head>
<body>
  ${body}
  <script src="/admin/static/admin.js" defer></script>
</body>
</html>`;
}

function renderLoginPage({ error, nextUrl }) {
  const body = `
  <main class="auth-page">
    <section class="auth-card">
      <div class="brand">
        ${brandLogo()}
        <div>
          <h1>Alucraft Admin</h1>
          <p>Panel interno de stock</p>
        </div>
      </div>
      ${error ? `<div class="alert alert-error">${escapeHtml(error)}</div>` : ""}
      <form method="post" action="/admin/login" class="form">
        <input type="hidden" name="next" value="${escapeHtml(nextUrl)}">
        <label>
          <span>Usuario</span>
          <input type="text" name="username" autocomplete="username" required autofocus>
        </label>
        <label>
          <span>Contraseña</span>
          <input type="password" name="password" autocomplete="current-password" required>
        </label>
        <button type="submit" class="btn btn-primary btn-block">Ingresar</button>
      </form>
    </section>
  </main>`;

  return layout({ title: "Login", body, extraHead: "" });
}

function renderInfoPanel() {
  return `
  <section class="info-panel">
    <h2>¿Cómo leer este panel?</h2>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-step">1</span>
        <div>
          <strong>Componentes</strong>
          <p>Stock <em>físico</em> en depósito (estructuras + almohadones). Acá cargás lo que tenés realmente.</p>
        </div>
      </div>
      <div class="info-item">
        <span class="info-step">2</span>
        <div>
          <strong>Listo para vender</strong>
          <p>Cuántos productos terminados se pueden armar con esos componentes. Shopify muestra estos números en la tienda.</p>
        </div>
      </div>
      <div class="info-item">
        <span class="info-step">3</span>
        <div>
          <strong>Recalcular</strong>
          <p>Actualiza los productos terminados en Shopify según el stock de componentes. Tocá el botón después de cargar piezas.</p>
        </div>
      </div>
    </div>
  </section>`;
}

function renderComponentGroups(groups) {
  if (!groups?.length) {
    return `<p class="empty-state">No se pudieron cargar los componentes.</p>`;
  }

  return groups
    .map((group) => {
      const tables = group.products
        .map((product) => {
          const rows = product.variants
            .map(
              (v) => `
            <tr>
              <td>${escapeHtml(product.label)}</td>
              <td>${escapeHtml(v.title)}</td>
              <td><code class="sku">${escapeHtml(v.sku)}</code></td>
              <td class="num ${v.stock === 0 ? "zero" : ""}"><strong>${v.stock}</strong></td>
            </tr>`
            )
            .join("");

          return rows;
        })
        .join("");

      return `
      <article class="component-group">
        <header class="component-group-head">
          <h3>${escapeHtml(group.title)}</h3>
          <p class="muted">${escapeHtml(group.hint)}</p>
        </header>
        <div class="table-wrap">
          <table class="stock-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Variante</th>
                <th>SKU</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>${tables}</tbody>
          </table>
        </div>
      </article>`;
    })
    .join("");
}

function bottleneckLabel(bottleneck) {
  if (!bottleneck) {
    return "";
  }
  const qty =
    bottleneck.qtyPerUnit && bottleneck.qtyPerUnit > 1
      ? ` (necesita ${bottleneck.qtyPerUnit})`
      : "";
  return `<span class="bottleneck" title="Pieza que limita esta variante">Limita: ${escapeHtml(bottleneck.label)} — ${bottleneck.available} disp.${qty}</span>`;
}

function renderStructurePools(pools) {
  if (!pools?.length) {
    return "";
  }

  const items = pools
    .map((pool) => {
      const parts = pool.variants
        .map((v) => `${escapeHtml(v.title.split(" / ").pop() || v.title)}: ${v.fabricable}`)
        .join(" · ");
      return `
      <li>
        <strong>${escapeHtml(pool.structureColor)}</strong>:
        ${pool.structureStock} estructura(s) → repartidas: ${parts || "—"}
      </li>`;
    })
    .join("");

  return `<ul class="pool-list">${items}</ul>`;
}

function renderFinishedProduct(product, thresholds) {
  const threshold = thresholds[product.key];
  const withStock = product.variants.filter((v) => v.fabricable > 0);
  const isLow = product.totalFabricable <= (threshold ?? 0);

  const variantRows = product.variants
    .map((v) => {
      const low = v.fabricable <= (threshold ?? 0);
      const zero = v.fabricable === 0;
      const breakdown =
        product.key === "juego" && v.breakdown
          ? `<span class="breakdown">S1: ${v.breakdown.sillon1} · S3: ${v.breakdown.sillon3} · Mesa ${escapeHtml(v.breakdown.mesaColor)}: ${v.breakdown.mesa}</span>`
          : v.cushionCap != null && product.sharedStructure
            ? `<span class="breakdown">Máx. por almohadones: ${v.cushionCap}</span>`
            : "";

      return `
      <tr class="${zero ? "row-zero" : ""} ${low && !zero ? "row-low" : ""}">
        <td>${escapeHtml(v.title)}</td>
        <td class="num"><strong>${v.fabricable}</strong></td>
        <td class="meta">${breakdown}${bottleneckLabel(v.bottleneck)}</td>
      </tr>`;
    })
    .join("");

  return `
  <article class="card finished-card ${isLow ? "card-warning" : ""}">
    <header class="card-header">
      <div>
        <h2>${escapeHtml(product.title)}</h2>
        <p class="card-hint">${escapeHtml(product.hint)}</p>
      </div>
      ${isLow ? '<span class="badge badge-warning">Stock bajo</span>' : ""}
    </header>
    <div class="finished-summary">
      <p class="card-total">${product.totalFabricable}</p>
      <p class="card-sub">unidades vendibles · ${withStock.length} variante(s) con stock</p>
    </div>
    ${product.structurePools?.length ? `<div class="pool-box"><span class="pool-label">Reparto de estructuras</span>${renderStructurePools(product.structurePools)}</div>` : ""}
    <div class="table-wrap">
      <table class="stock-table stock-table-compact">
        <thead>
          <tr>
            <th>Variante (estructura / tela)</th>
            <th>Disponible</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>${variantRows}</tbody>
      </table>
    </div>
  </article>`;
}

function renderLegacyStockCards(stock, thresholds) {
  return stock.products
    .map((product) => {
      const threshold = thresholds[product.key];
      const isLow = product.variants.some((v) => v.available <= threshold);
      const variantLines = product.variants
        .map((v) => {
          const low = v.available <= threshold;
          return `<li class="${low ? "low" : ""}">${escapeHtml(v.title)}: <strong>${v.available}</strong></li>`;
        })
        .join("");

      return `
      <article class="card ${isLow ? "card-warning" : ""}">
        <header class="card-header">
          <h2>${escapeHtml(product.title)}</h2>
          ${isLow ? '<span class="badge badge-warning">Stock bajo</span>' : ""}
        </header>
        <p class="card-total">${product.totalAvailable}</p>
        <p class="card-sub">unidades totales</p>
        <ul class="variant-list">${variantLines}</ul>
      </article>`;
    })
    .join("");
}

function renderDashboardPage({
  stock,
  bomView,
  lastSync,
  thresholds,
  whatsappStatus,
  whatsappEnabled,
  shopifyOrdersUrl,
}) {
  const lastSyncText = lastSync
    ? `${formatDateTime(lastSync.at)} (${lastSync.source === "webhook" ? "webhook" : "manual"})`
    : "Todavía no hubo recálculos en esta instancia";

  const fetchedAt = formatDateTime(stock.fetchedAt);
  const useBomView = bomView?.mode === "components" && bomView.components && bomView.finished;

  const inventoryBody = useBomView
    ? `
        ${renderInfoPanel()}
        <section class="subsection">
          <div class="subsection-head">
            <h2>Componentes — stock físico</h2>
            <p class="muted">${bomView.components.totalPhysicalUnits} piezas en total (suma de todas las variantes)</p>
          </div>
          <div class="component-groups">${renderComponentGroups(bomView.components.groups)}</div>
        </section>
        <section class="subsection">
          <div class="subsection-head">
            <h2>Listo para vender — calculado</h2>
            <p class="muted">Lo que aparece en Shopify después de recalcular</p>
          </div>
          <div class="finished-grid">${bomView.finished.map((p) => renderFinishedProduct(p, thresholds)).join("")}</div>
        </section>`
    : `<div class="cards-grid">${renderLegacyStockCards(stock, thresholds)}</div>`;

  const body = `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-inline">
        ${brandLogo()}
        <div>
          <strong>Alucraft Admin</strong>
          <span class="muted">Stock</span>
        </div>
      </div>
      <div class="topbar-actions">
        <a class="btn btn-small" href="${escapeHtml(shopifyOrdersUrl)}" target="_blank" rel="noopener">Pedidos en Shopify</a>
        <form method="post" action="/admin/logout">
          <button type="submit" class="btn btn-ghost">Salir</button>
        </form>
      </div>
    </header>

    <main class="content content-wide">
      <section class="section">
        <div class="section-head row-between">
          <div>
            <h1>Inventario</h1>
            <p class="muted">Consultado ${escapeHtml(fetchedAt)}</p>
          </div>
          <button type="button" id="sync-btn" class="btn btn-primary">Recalcular inventario</button>
        </div>
        <div id="sync-result" class="sync-result" hidden></div>
        <div class="stats-row">
          <div class="stat-chip">
            <span>Última sincronización</span>
            <strong class="stat-small">${escapeHtml(lastSyncText)}</strong>
          </div>
          <div class="stat-chip">
            <span>WhatsApp alertas</span>
            <strong class="stat-small">${escapeHtml(whatsappStatus)}</strong>
            ${
              whatsappEnabled
                ? `<button type="button" id="whatsapp-test-btn" class="btn btn-small" style="margin-top:0.5rem">Probar WhatsApp</button>
                   <span id="whatsapp-test-result" class="muted" style="display:block;margin-top:0.35rem;font-size:0.8rem"></span>`
                : `<span class="muted" style="display:block;margin-top:0.35rem;font-size:0.8rem">Configurá Twilio en Vercel</span>`
            }
          </div>
        </div>
      </section>

      <section class="section">
        ${inventoryBody}
      </section>
    </main>
  </div>`;

  return layout({ title: "Dashboard", body });
}

module.exports = {
  escapeHtml,
  formatDateTime,
  renderLoginPage,
  renderDashboardPage,
};
