const { renderPaintWorkshopPanel } = require("./adminPaintPages");

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
  <link rel="icon" href="/admin/static/alucraft-logo.png" type="image/png">
  <link rel="apple-touch-icon" href="/admin/static/alucraft-logo.png">
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
  if (n.includes("natural")) return "c-natural";
  if (n.startsWith("pintura") || n.includes("en pintura")) {
    if (n.includes("nm") || n.includes("negro")) return "c-black";
    if (n.includes("arena") || /\bar\b/.test(n)) return "c-arena";
    return "c-wip";
  }
  if (n.includes("marr")) return "c-brown";
  if (n.includes("negro")) return "c-black";
  if (n.includes("beige")) return "c-beige";
  if (n.includes("claro")) return "c-gray-l";
  if (n.includes("oscuro")) return "c-gray-d";
  if (n.includes("arena")) return "c-arena";
  if (n.includes("tostado")) return "c-tostado";
  return "c-default";
}

function variantStage(title) {
  const n = String(title || "").toLowerCase();
  if (n.includes("natural")) return "natural";
  if (n.startsWith("pintura") || n.includes("en pintura")) return "wip";
  return "ready";
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

function boxIcon() {
  return `<svg class="box-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`;
}

function toolIcon() {
  return `<svg class="box-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
}

function pkgIconFor(groupId) {
  return String(groupId || "").includes("allen") ? toolIcon() : boxIcon();
}

function renderDepositoItem(product, isPackaging, icon) {
  if (isPackaging) {
    return `
  <div class="depo-item depo-item-pkg">
    <header>
      <h4>${icon} ${escapeHtml(product.label)}</h4>
    </header>
    <div class="depo-pkg-body">
      <strong>${product.totalStock}</strong>
      <span>en depósito</span>
    </div>
  </div>`;
  }

  const colors = product.variants
    .map((v) => {
      const stage = variantStage(v.title);
      return `
    <div class="depo-color depo-color-${stage}">
      <i class="${colorClass(v.title)}"></i>
      <span>${escapeHtml(v.title)}</span>
      <strong>${v.stock}</strong>
    </div>`;
    })
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

function stockQtyInput(variant, productLabel) {
  const label = `${productLabel} / ${variant.title}`;
  return `<input
    type="number"
    min="0"
    step="1"
    inputmode="numeric"
    class="stock-qty"
    data-sku="${escapeHtml(variant.sku)}"
    data-label="${escapeHtml(label)}"
    placeholder="—"
    aria-label="${escapeHtml(label)}"
  >`;
}

function loadTabForVariant(group, variant) {
  const groupId = String(group.id || "");
  if (groupId.startsWith("packaging")) return "cajas";
  if (groupId.startsWith("cushions")) return "telas";
  const stage = variantStage(variant.title);
  if (stage === "wip") return null;
  if (stage === "natural") return "natural";
  const n = String(variant.title || "").toLowerCase();
  if (n.includes("negro")) return "negro";
  if (n.includes("arena")) return "arena";
  return null;
}

function renderStockSimpleRows(items) {
  const byGroup = [];
  for (const item of items) {
    const title = item.group.title;
    const last = byGroup[byGroup.length - 1];
    if (!last || last.title !== title) {
      byGroup.push({ title, items: [item] });
    } else {
      last.items.push(item);
    }
  }

  return byGroup
    .map((block) => {
      const rows = block.items
        .map(
          ({ product, variant }) => `
      <tr>
        <th>
          <strong>${escapeHtml(product.label)}</strong>
          <span class="paint-use">${escapeHtml(variant.sku)}</span>
        </th>
        <td class="num">${variant.stock}</td>
        <td class="qty">${stockQtyInput(variant, product.label)}</td>
      </tr>`
        )
        .join("");
      return `
      <tbody>
        <tr class="paint-group"><th colspan="3">${escapeHtml(block.title)}</th></tr>
        ${rows}
      </tbody>`;
    })
    .join("");
}

function renderStockFabricTable(items) {
  const colors = [];
  for (const item of items) {
    const color = item.variant.title;
    if (color && !colors.includes(color)) colors.push(color);
  }
  const preferred = ["Beige", "Tostado", "Gris oscuro", "Gris claro"];
  colors.sort((a, b) => {
    const ia = preferred.indexOf(a);
    const ib = preferred.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const products = [];
  for (const item of items) {
    const key = item.product.label;
    let row = products.find((p) => p.label === key);
    if (!row) {
      row = { label: key, byColor: new Map() };
      products.push(row);
    }
    row.byColor.set(item.variant.title, item.variant);
  }

  const head = colors
    .map(
      (color) =>
        `<th><span class="pill-dots"><i class="${colorClass(color)}"></i></span>${escapeHtml(color)}</th>`
    )
    .join("");

  const body = products
    .map((product) => {
      const cells = colors
        .map((color) => {
          const variant = product.byColor.get(color);
          if (!variant) return `<td class="qty muted">—</td>`;
          return `<td class="qty stock-cell">
            <span class="num">${variant.stock}</span>
            ${stockQtyInput(variant, product.label)}
          </td>`;
        })
        .join("");
      return `<tr><th>${escapeHtml(product.label)}</th>${cells}</tr>`;
    })
    .join("");

  return `
    <table class="paint-table">
      <thead>
        <tr>
          <th>Almohadón</th>
          ${head}
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>`;
}

function renderStockLoadForm(groups) {
  const buckets = { natural: [], negro: [], arena: [], telas: [], cajas: [] };
  for (const group of groups || []) {
    for (const product of group.products || []) {
      for (const variant of product.variants || []) {
        if (!variant.sku) continue;
        const tab = loadTabForVariant(group, variant);
        if (!tab || !buckets[tab]) continue;
        buckets[tab].push({ group, product, variant });
      }
    }
  }

  const tabs = [
    { id: "natural", title: "Natural", swatch: "c-natural", hint: "Sin pintar — lo que llega crudo." },
    { id: "negro", title: "Negro", swatch: "c-black", hint: "Pintado negro microtexturado." },
    { id: "arena", title: "Arena", swatch: "c-arena", hint: "Pintado arena." },
    { id: "telas", title: "Almohadones", swatch: "c-beige", hint: "Por color de tela." },
    { id: "cajas", title: "Cajas", swatch: "c-default", hint: "Cajas y llaves Allen." },
  ];

  const tabButtons = tabs
    .map(
      (tab, index) => `
      <button type="button" class="btn btn-outline${index === 0 ? " is-active" : ""}" data-stock-tab="${tab.id}">
        <span class="pill-dots"><i class="${tab.swatch}"></i></span>
        ${escapeHtml(tab.title)}
      </button>`
    )
    .join("");

  const panels = tabs
    .map((tab) => {
      const items = buckets[tab.id] || [];
      const table =
        tab.id === "telas"
          ? renderStockFabricTable(items)
          : `<table class="paint-table">
              <thead>
                <tr>
                  <th>Pieza</th>
                  <th>Hay</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              ${renderStockSimpleRows(items)}
            </table>`;
      return `
      <div class="stock-panel" data-stock-panel="${tab.id}" ${tab.id === "natural" ? "" : "hidden"}>
        <p class="stock-hint">${escapeHtml(tab.hint)}</p>
        <div class="table-scroll">${table}</div>
      </div>`;
    })
    .join("");

  return `
  <section class="paint-board" id="stock-load">
    <h3>Cargar depósito</h3>
    <p>Elegí el color o el tipo, anotá cantidades y guardá. Vacío = no cambia. No recalcula la tienda.</p>
    <form id="stock-load-form" class="paint-table-form">
      <fieldset class="stock-mode">
        <legend>Qué hacer</legend>
        <label><input type="radio" name="mode" value="add" checked> Sumar (llegó)</label>
        <label><input type="radio" name="mode" value="subtract"> Restar (ajuste)</label>
        <label><input type="radio" name="mode" value="set"> Dejar en (conteo)</label>
      </fieldset>
      <div class="paint-toolbar stock-tabs">${tabButtons}</div>
      ${panels}
      <div class="paint-actions">
        <button type="submit" class="btn btn-outline">Guardar en depósito</button>
      </div>
    </form>
    <p id="stock-load-status" class="paint-status" hidden></p>
  </section>`;
}

function renderDepositoView(groups) {
  return groups
    .map((group) => {
      const isPackaging = String(group.id || "").startsWith("packaging");
      const icon = pkgIconFor(group.id);
      const heading = isPackaging ? `${icon} ${escapeHtml(group.title)}` : escapeHtml(group.title);
      return `
    <section class="depo-block">
      <h3>${heading}</h3>
      <div class="depo-grid">${group.products.map((p) => renderDepositoItem(p, isPackaging, icon)).join("")}</div>
    </section>`;
    })
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
        <button type="button" class="dash-nav-btn" data-view="pintura">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
          Pintura
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
        <p class="panel-lead">Piezas físicas en depósito. Natural no se vende; En pintura está en el taller; Pintado es lo que entra al BOM.</p>
        ${useBomView ? renderStockLoadForm(bomView.components.groups) : ""}
        <div class="deposito-wrap">${depositoHtml}</div>
      </div>

      <div id="view-pintura" class="dash-panel">
        <p class="panel-lead">Imprimí los códigos para el taller, mandá un lote a pintar o registrá lo que volvió. No recalcula la tienda.</p>
        ${
          useBomView && bomView.paintPieces
            ? renderPaintWorkshopPanel(bomView.paintPieces)
            : `<p class="empty-state">Cargá las piezas en Shopify para usar pintura.</p>`
        }
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
