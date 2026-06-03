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
        <span class="brand-mark">A</span>
        <div>
          <h1>Alucraft Admin</h1>
          <p>Panel interno de stock y pedidos</p>
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

function orderCard(order) {
  const items = order.lineItems.map((line) => `<li>${escapeHtml(line)}</li>`).join("");

  return `
  <article class="order-card">
    <header class="order-header">
      <div>
        <h3>${escapeHtml(order.name)}</h3>
        <p class="muted">${escapeHtml(order.customer)} · ${escapeHtml(order.createdAtFormatted)}</p>
      </div>
      <a class="btn btn-small" href="${escapeHtml(order.adminUrl)}" target="_blank" rel="noopener">Abrir en Shopify</a>
    </header>
    <ul class="order-items">${items}</ul>
    <footer class="order-footer">
      <span class="pill">${escapeHtml(order.financialStatus)}</span>
      <span class="pill">${escapeHtml(order.fulfillmentStatus)}</span>
      <strong>${escapeHtml(order.total)}</strong>
    </footer>
  </article>`;
}

function renderDashboardPage({ stock, orders, lastSync, thresholds, whatsappStatus, flash }) {
  const cards = stock.products.map((p) => stockCard(p, thresholds)).join("");
  const orderCards =
    orders.orders.length > 0
      ? orders.orders.map(orderCard).join("")
      : '<p class="empty-state">No hay pedidos pendientes de preparación.</p>';

  const lastSyncText = lastSync
    ? `${formatDateTime(lastSync.at)} (${lastSync.source === "webhook" ? "webhook" : "manual"})`
    : "Todavía no hubo recálculos en esta instancia";

  const fetchedAt = formatDateTime(stock.fetchedAt);

  const flashHtml = flash
    ? `<div class="alert ${flash.type === "error" ? "alert-error" : "alert-success"}">${escapeHtml(flash.message)}</div>`
    : "";

  const body = `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-inline">
        <span class="brand-mark">A</span>
        <div>
          <strong>Alucraft Admin</strong>
          <span class="muted">Stock &amp; pedidos</span>
        </div>
      </div>
      <form method="post" action="/admin/logout">
        <button type="submit" class="btn btn-ghost">Salir</button>
      </form>
    </header>

    <main class="content">
      ${flashHtml}

      <section class="section">
        <div class="section-head">
          <h1>Resumen</h1>
          <p class="muted">Consultado ${escapeHtml(fetchedAt)}</p>
        </div>
        <div class="stats-row">
          <div class="stat-chip">
            <span>Pedidos pendientes</span>
            <strong>${orders.count}</strong>
          </div>
          <div class="stat-chip">
            <span>Última sincronización</span>
            <strong class="stat-small">${escapeHtml(lastSyncText)}</strong>
          </div>
          <div class="stat-chip">
            <span>WhatsApp alertas</span>
            <strong class="stat-small">${escapeHtml(whatsappStatus)}</strong>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-head row-between">
          <h2>Inventario</h2>
          <button type="button" id="sync-btn" class="btn btn-primary">Recalcular stock de juegos</button>
        </div>
        <div id="sync-result" class="sync-result" hidden></div>
        <div class="cards-grid">${cards}</div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>Pedidos pendientes</h2>
        </div>
        <div class="orders-list">${orderCards}</div>
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
