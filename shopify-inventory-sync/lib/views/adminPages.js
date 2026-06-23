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

function stockCard(product, thresholds) {
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
}

function renderDashboardPage({
  stock,
  lastSync,
  thresholds,
  whatsappStatus,
  whatsappEnabled,
  shopifyOrdersUrl,
}) {
  const cards = stock.products.map((p) => stockCard(p, thresholds)).join("");

  const lastSyncText = lastSync
    ? `${formatDateTime(lastSync.at)} (${lastSync.source === "webhook" ? "webhook" : "manual"})`
    : "Todavía no hubo recálculos en esta instancia";

  const fetchedAt = formatDateTime(stock.fetchedAt);

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

    <main class="content">
      <section class="section">
        <div class="section-head">
          <h1>Resumen</h1>
          <p class="muted">Consultado ${escapeHtml(fetchedAt)}</p>
        </div>
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
        <div class="section-head row-between">
          <h2>Inventario</h2>
          <button type="button" id="sync-btn" class="btn btn-primary">Recalcular inventario</button>
        </div>
        <div id="sync-result" class="sync-result" hidden></div>
        <div class="cards-grid">${cards}</div>
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
