(function () {
  const viewTitle = document.getElementById("view-title");
  const syncBtn = document.getElementById("sync-btn");
  const syncToast = document.getElementById("sync-toast");

  const VIEW_TITLES = {
    tienda: "Tienda",
    deposito: "Depósito",
    pintura: "Pintura",
  };

  function showView(view) {
    if (!VIEW_TITLES[view]) return;

    document.querySelectorAll(".dash-nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });
    document.querySelectorAll(".dash-panel").forEach((panel) => panel.classList.remove("active"));
    const panel = document.getElementById(`view-${view}`);
    if (panel) panel.classList.add("active");
    if (viewTitle) viewTitle.textContent = VIEW_TITLES[view];
    if (location.hash !== `#${view}`) {
      history.replaceState(null, "", `#${view}`);
    }
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-view]");
    if (!trigger || trigger.tagName === "A") return;
    showView(trigger.dataset.view);
  });

  const hashView = String(location.hash || "").replace("#", "");
  if (VIEW_TITLES[hashView]) {
    showView(hashView);
  }

  function showToast(message, type) {
    if (!syncToast) return;
    syncToast.hidden = false;
    syncToast.className = `sync-toast ${type}`;
    syncToast.textContent = message;
  }

  const PRODUCT_LABELS = {
    sillon1: "Sillón 1",
    sillon3: "Sillón 3",
    mesa: "Mesa",
    reposera: "Reposera",
    juego: "Juego",
  };

  function formatSyncSummary(syncResult) {
    if (!syncResult || syncResult.mode !== "components") {
      return "Inventario actualizado.";
    }

    const parts = [];
    for (const [key, product] of Object.entries(syncResult.products || {})) {
      if (!product?.synced?.length) continue;
      const total = product.synced.reduce((s, r) => s + (r.calculated ?? 0), 0);
      parts.push(`${PRODUCT_LABELS[key] || key}: ${total}`);
    }
    return parts.length ? parts.join(" · ") : "Inventario actualizado.";
  }

  if (syncBtn) {
    syncBtn.addEventListener("click", async () => {
      syncBtn.disabled = true;
      showToast("Recalculando…", "ok");

      try {
        const response = await fetch("/admin/api/sync", {
          method: "POST",
          headers: { Accept: "application/json" },
          credentials: "same-origin",
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Error al recalcular");
        }

        showToast(`✓ ${formatSyncSummary(data.synced)}`, "ok");
        setTimeout(() => window.location.reload(), 1200);
      } catch (error) {
        showToast(error.message || "Error al recalcular", "err");
        syncBtn.disabled = false;
      }
    });
  }

  const whatsappBtn = document.getElementById("whatsapp-test-btn");
  const whatsappResult = document.getElementById("whatsapp-test-result");

  if (whatsappBtn && whatsappResult) {
    whatsappBtn.addEventListener("click", async () => {
      whatsappBtn.disabled = true;
      whatsappResult.textContent = "Enviando…";

      try {
        const response = await fetch("/admin/api/test-whatsapp", {
          method: "POST",
          headers: { Accept: "application/json" },
          credentials: "same-origin",
        });

        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Error");
        }
        whatsappResult.textContent = "Enviado ✓";
      } catch (error) {
        whatsappResult.textContent = error.message || "Error";
      } finally {
        whatsappBtn.disabled = false;
      }
    });
  }

  const COLOR_LABEL = {
    NM: "Negro Microtexturado",
    AR: "Arena",
  };

  function linesFromForm(form) {
    const lines = [];
    form.querySelectorAll("tr[data-piece]").forEach((row) => {
      const pieceKey = row.dataset.piece;
      const label = row.querySelector("strong")?.textContent?.trim() || pieceKey;
      const natural = Number(row.dataset.natural);
      let rowTotal = 0;

      for (const color of ["NM", "AR"]) {
        const input = form.querySelector(`[name="${pieceKey}-${color}"]`);
        const qty = Math.floor(Number(input?.value || 0));
        if (!input || !Number.isFinite(qty) || qty < 1) continue;
        rowTotal += qty;
        lines.push({
          pieceKey,
          color,
          qty,
          label,
          sku: row.dataset.sku || "",
          skuPainted: color === "NM" ? row.dataset.skuNm : row.dataset.skuAr,
        });
      }

      if (Number.isFinite(natural) && rowTotal > natural) {
        throw new Error(
          `${label}: Natural hay ${natural}, anotaste ${rowTotal} (negro + arena)`
        );
      }
    });
    return lines;
  }

  function renderOrder(action, lines) {
    const title = action === "send" ? "Orden de pintura" : "Recepción de pintura";
    const date = new Intl.DateTimeFormat("es-AR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date());
    const rows = lines
      .map((line) => {
        const paintedSku = line.skuPainted || `${line.sku}-${line.color}`;
        return `<tr>
          <td>${line.label}</td>
          <td class="num">${line.qty}</td>
          <td>${COLOR_LABEL[line.color] || line.color}</td>
          <td><code>${paintedSku}</code></td>
        </tr>`;
      })
      .join("");
    const total = lines.reduce((sum, line) => sum + line.qty, 0);

    return {
      title,
      html: `
      <header class="print-order-head">
        <img src="/admin/static/alucraft-logo.png" alt="Alucraft" width="36" height="36">
        <div>
          <h2>${title}</h2>
          <p>${date} · ${total} piezas</p>
        </div>
      </header>
      <table class="paint-table print-table">
        <thead>
          <tr>
            <th>Pieza</th>
            <th>Cant.</th>
            <th>Color</th>
            <th>Código</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="print-note">${
        action === "send"
          ? "Al volver, el código es el de la última columna (NM negro, AR arena)."
          : "Ya está cargado en depósito como Pintado."
      }</p>`,
    };
  }

  async function submitPaint(form, action) {
    const status = document.getElementById("paint-status");
    const order = document.getElementById("paint-order");
    const orderTitle = document.getElementById("paint-order-title");
    const orderBody = document.getElementById("paint-order-body");
    const submitBtn = form.querySelector("button[type=submit]");
    const lines = linesFromForm(form);

    if (!lines.length) {
      throw new Error("Marcá al menos una cantidad");
    }

    if (submitBtn) submitBtn.disabled = true;
    if (status) {
      status.hidden = false;
      status.className = "paint-status";
      status.textContent = action === "send" ? "Mandando a pintar…" : "Registrando recepción…";
    }

    const response = await fetch("/admin/api/paint", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        action,
        lines: lines.map(({ pieceKey, color, qty }) => ({ pieceKey, color, qty })),
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Error al mover pintura");
    }

    const printed = renderOrder(action, lines);
    if (order && orderBody) {
      order.hidden = false;
      if (orderTitle) orderTitle.textContent = printed.title;
      orderBody.innerHTML = printed.html;
      order.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (status) {
      status.className = "paint-status is-ok";
      status.textContent =
        action === "send"
          ? `Mandaste ${lines.reduce((s, l) => s + l.qty, 0)} piezas. Imprimí la orden para el taller.`
          : `Recibiste ${lines.reduce((s, l) => s + l.qty, 0)} piezas pintadas.`;
    }

    form.querySelectorAll('input[type="number"]').forEach((input) => {
      if (!input.disabled) input.value = "0";
    });
    if (submitBtn) submitBtn.disabled = false;
  }

  function bindPaintForm(id, action) {
    const form = document.getElementById(id);
    if (!form) return;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await submitPaint(form, action);
      } catch (error) {
        const status = document.getElementById("paint-status");
        if (status) {
          status.hidden = false;
          status.className = "paint-status is-err";
          status.textContent = error.message || "Error";
        }
        form.querySelectorAll("button[type=submit]").forEach((btn) => {
          btn.disabled = false;
        });
      }
    });
  }

  bindPaintForm("paint-send-form", "send");
  bindPaintForm("paint-receive-form", "receive");

  document.querySelectorAll("[data-paint-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.paintTab;
      document.querySelectorAll("[data-paint-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.paintPanel !== tab;
      });
      document.querySelectorAll("[data-paint-tab]").forEach((other) => {
        other.classList.toggle("is-active", other === btn);
      });
    });
  });

  const sendTabBtn = document.querySelector('[data-paint-tab="send"]');
  if (sendTabBtn) sendTabBtn.classList.add("is-active");

  document.querySelectorAll("[data-stock-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.stockTab;
      document.querySelectorAll("[data-stock-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.stockPanel !== tab;
      });
      document.querySelectorAll("[data-stock-tab]").forEach((other) => {
        other.classList.toggle("is-active", other === btn);
      });
    });
  });

  const printOrderBtn = document.getElementById("paint-order-print");
  if (printOrderBtn) {
    printOrderBtn.addEventListener("click", () => {
      document.body.classList.add("printing-order");
      window.print();
      window.setTimeout(() => document.body.classList.remove("printing-order"), 300);
    });
  }

  const reloadBtn = document.getElementById("paint-order-reload");
  if (reloadBtn) {
    reloadBtn.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.href = "/admin#pintura";
      window.location.reload();
    });
  }

  const stockForm = document.getElementById("stock-load-form");
  const stockStatus = document.getElementById("stock-load-status");
  const MODE_LABEL = {
    add: "Sumar",
    subtract: "Restar",
    set: "Dejar en",
  };

  if (stockForm) {
    stockForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitBtn = stockForm.querySelector("button[type=submit]");
      const mode = stockForm.querySelector('input[name="mode"]:checked')?.value || "add";

      const showStockStatus = (type, message) => {
        if (!stockStatus) return;
        stockStatus.hidden = false;
        stockStatus.className = `paint-status ${type}`;
        stockStatus.textContent = message;
      };

      try {
        const lines = [];
        stockForm.querySelectorAll(".stock-qty").forEach((input) => {
          const raw = String(input.value || "").trim();
          if (raw === "") return;
          const qty = Math.floor(Number(raw));
          if (!Number.isFinite(qty) || qty < 0) {
            throw new Error("Las cantidades tienen que ser enteros de 0 o más");
          }
          lines.push({
            sku: input.dataset.sku,
            qty,
            label: input.dataset.label || input.dataset.sku,
          });
        });

        if (!lines.length) {
          throw new Error("Marcá al menos una cantidad");
        }

        const total = lines.reduce((sum, line) => sum + line.qty, 0);
        const ok = window.confirm(
          `${MODE_LABEL[mode] || mode}: ${lines.length} códigos (${total} u.). ¿Guardar en depósito?`
        );
        if (!ok) return;

        if (submitBtn) submitBtn.disabled = true;
        showStockStatus("", "Guardando…");

        const response = await fetch("/admin/api/stock", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({ mode, lines }),
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Error al guardar stock");
        }

        showStockStatus("is-ok", `Guardado: ${data.applied.length} códigos. Actualizando…`);
        window.location.hash = "deposito";
        window.setTimeout(() => window.location.reload(), 700);
      } catch (error) {
        showStockStatus("is-err", error.message || "Error");
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
})();
