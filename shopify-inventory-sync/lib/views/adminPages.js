function brandLogo() {
  return `<img src="/admin/static/alucraft-logo.png" alt="Alucraft" class="brand-logo" width="40" height="40">`;
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
  <title>${escapeHtml(title)} — Alucraft</title>
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
          <h1>Alucraft</h1>
          <p>Panel de stock</p>
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

  return layout({ title: "Login", body });
}

const PRODUCT_SHORT = {
  juego: { code: "JG", name: "Juego Living" },
  sillon1: { code: "S1", name: "Sillón 1 cuerpo" },
  sillon3: { code: "S3", name: "Sillón 3 cuerpos" },
  mesa: { code: "MR", name: "Mesa ratona" },
  reposera: { code: "RP", name: "Reposera" },
};

function colorClass(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("marr")) return "c-brown";
  if (n.includes("negro")) return "c-black";
  if (n.includes("beige")) return "c-beige";
  if (n.includes("claro")) return "c-gray-l";
  if (n.includes("oscuro")) return "c-gray-d";
  return "c-default";
}

function renderVariantPills(variants, { showZero = false } = {}) {
  const visible = showZero ? variants : variants.filter((v) => (v.fabricable ?? v.available ?? 0) > 0);

  if (visible.length === 0) {
    return `<span class="empty-pill">Sin stock</span>`;
  }

  return visible
    .map((v) => {
      const qty = v.fabricable ?? v.available ?? 0;
      const title = v.title || "";
      const parts = title.includes(" / ") ? title.split(" / ") : [title];

      const dots =
        parts.length > 1
          ? `<span class="pill-dots"><i class="${colorClass(parts[0])}"></i><i class="${colorClass(parts[1])}"></i></span>`
          : `<span class="pill-dots"><i class="${colorClass(parts[0])}"></i></span>`;

      return `
      <span class="vpill ${qty === 0 ? "vpill-zero" : ""}" title="${escapeHtml(title)}">
        <em>${qty}</em>
        ${dots}
        <span class="vpill-label">${escapeHtml(title)}</span>
      </span>`;
    })
    .join("");
}

function renderTiendaRow(product, thresholds) {
  const meta = PRODUCT_SHORT[product.key] || { code: "?", name: product.title };
  const threshold = thresholds[product.key] ?? 0;
  const isLow = product.totalFabricable <= threshold;
  const variants = product.variants || [];

  return `
  <article class="tienda-row ${isLow ? "is-low" : ""}" data-product="${escapeHtml(product.key)}">
    <div class="tienda-row-left">
      <span class="tienda-code">${escapeHtml(meta.code)}</span>
      <div>
        <h3>${escapeHtml(meta.name)}</h3>
        <p class="tienda-sub">${variants.filter((v) => v.fabricable > 0).length} variantes con stock</p>
      </div>
    </div>
    <div class="tienda-row-qty">
      <strong>${product.totalFabricable}</strong>
      <span>disponibles</span>
    </div>
    <div class="tienda-row-pills">
      ${renderVariantPills(variants)}
    </div>
  </article>`;
}

function renderDepositoItem(product) {
  const colors = product.variants
    .map(
      (v) => `
    <div class="depo-color">
      <i class="${colorClass(v.title)}"></i>
      <span>${escapeHtml(v.title)}</span>
      <strong>${v.stock}</strong>
    </div>`
    )
    .join("");

  return `
  <div class="depo-item">
    <header>
      <h4>${escapeHtml(product.label)}</h4>
      <span>${product.totalStock} u.</span>
    </header>
    <div class="depo-colors">${colors}</div>
  </div>`;
}

function renderDepositoView(groups) {
  return groups
    .map(
      (group) => `
    <section class="depo-block">
      <h3>${escapeHtml(group.title)}</h3>
      <div class="depo-grid">${group.products.map(renderDepositoItem).join("")}</div>
    </section>`
    )
    .join("");
}

function renderLegacyTienda(stock, thresholds) {
  const products = stock.products.map((p) => ({
    key: p.key,
    title: p.title,
    totalFabricable: p.totalAvailable,
    variants: p.variants.map((v) => ({ title: v.title, fabricable: v.available, available: v.available })),
  }));

  return products.map((p) => renderTiendaRow(p, thresholds)).join("");
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
    ? formatDateTime(lastSync.at)
    : "Nunca";

  const fetchedAt = formatDateTime(stock.fetchedAt);
  const useBomView = bomView?.mode === "components" && bomView.components && bomView.finished;

  const tiendaProducts = useBomView ? bomView.finished : null;
  const tiendaHtml = useBomView
    ? tiendaProducts.map((p) => renderTiendaRow(p, thresholds)).join("")
    : renderLegacyTienda(stock, thresholds);

  const depositoHtml = useBomView
    ? renderDepositoView(bomView.components.groups)
    : `<p class="empty-state">Modo legacy — solo se muestra stock de productos terminados.</p>`;

  const totalPiezas = useBomView ? bomView.components.totalPhysicalUnits : "—";
  const totalVendible = useBomView
    ? bomView.finished.reduce((s, p) => s + p.totalFabricable, 0)
    : stock.products.reduce((s, p) => s + p.totalAvailable, 0);

  const body = `
  <div class="dash">
    <aside class="dash-side">
      <div class="dash-brand">
        ${brandLogo()}
        <div>
          <strong>Alucraft</strong>
          <span>Inventario</span>
        </div>
      </div>

      <nav class="dash-nav" id="dash-nav">
        <button type="button" class="dash-nav-btn active" data-view="tienda">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          Tienda
        </button>
        <button type="button" class="dash-nav-btn" data-view="deposito">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          Depósito
        </button>
      </nav>

      <div class="dash-side-foot">
        <button type="button" id="sync-btn" class="btn btn-accent btn-block">
          Recalcular todo
        </button>
        <a class="btn btn-ghost btn-block" href="${escapeHtml(shopifyOrdersUrl)}" target="_blank" rel="noopener">Shopify ↗</a>
        <form method="post" action="/admin/logout">
          <button type="submit" class="btn btn-ghost btn-block">Salir</button>
        </form>
      </div>
    </aside>

    <div class="dash-body">
      <header class="dash-top">
        <div>
          <h1 id="view-title">Tienda</h1>
          <p class="muted">Actualizado ${escapeHtml(fetchedAt)}</p>
        </div>
        <div class="dash-kpis">
          <div class="kpi">
            <span>Piezas en depósito</span>
            <strong>${totalPiezas}</strong>
          </div>
          <div class="kpi">
            <span>Listo para vender</span>
            <strong>${totalVendible}</strong>
          </div>
          <div class="kpi kpi-sm">
            <span>Último recálculo</span>
            <strong>${escapeHtml(lastSyncText)}</strong>
          </div>
        </div>
      </header>

      <div id="sync-toast" class="sync-toast" hidden></div>

      <div id="view-tienda" class="dash-panel active">
        <p class="panel-lead">Stock que ve el cliente en Shopify — calculado desde componentes.</p>
        <div class="tienda-list">${tiendaHtml}</div>
      </div>

      <div id="view-deposito" class="dash-panel">
        <p class="panel-lead">Piezas físicas en depósito — acá cargás stock en Shopify (productos borrador).</p>
        <div class="deposito-wrap">${depositoHtml}</div>
      </div>

      <footer class="dash-foot">
        <span>WhatsApp: ${escapeHtml(whatsappStatus)}</span>
        ${
          whatsappEnabled
            ? `<button type="button" id="whatsapp-test-btn" class="link-btn">Probar</button>
               <span id="whatsapp-test-result" class="muted"></span>`
            : `<span class="muted">Configurá variables en Vercel y redeploy</span>`
        }
      </footer>
    </div>
  </div>`;

  return layout({ title: "Stock", body });
}

module.exports = {
  escapeHtml,
  formatDateTime,
  renderLoginPage,
  renderDashboardPage,
};
