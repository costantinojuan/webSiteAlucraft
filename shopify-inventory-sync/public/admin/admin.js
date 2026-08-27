(function () {
  const nav = document.getElementById("dash-nav");
  const viewTitle = document.getElementById("view-title");
  const syncBtn = document.getElementById("sync-btn");
  const syncToast = document.getElementById("sync-toast");

  const VIEW_TITLES = {
    tienda: "Tienda",
    deposito: "Depósito",
  };

  if (nav) {
    nav.addEventListener("click", (e) => {
      const btn = e.target.closest(".dash-nav-btn");
      if (!btn) return;

      const view = btn.dataset.view;
      nav.querySelectorAll(".dash-nav-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      document.querySelectorAll(".dash-panel").forEach((p) => p.classList.remove("active"));
      const panel = document.getElementById(`view-${view}`);
      if (panel) panel.classList.add("active");
      if (viewTitle) viewTitle.textContent = VIEW_TITLES[view] || view;
    });
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

  const paintForm = document.getElementById("paint-form");
  const paintStatus = document.getElementById("paint-status");

  if (paintForm) {
      const buttons = paintForm.querySelectorAll("button[type=submit]");
      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          paintForm.dataset.action = btn.dataset.action || "";
        });
      });

      paintForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitter = event.submitter;
      const action = submitter?.dataset?.action || paintForm.dataset.action;
      if (!action) return;

      const formData = new FormData(paintForm);
      const payload = {
        pieceKey: String(formData.get("pieceKey") || ""),
        color: String(formData.get("color") || ""),
        qty: Number(formData.get("qty") || 0),
        action,
      };

      const buttons = paintForm.querySelectorAll("button[type=submit]");
      buttons.forEach((btn) => {
        btn.disabled = true;
      });

      if (paintStatus) {
        paintStatus.hidden = false;
        paintStatus.className = "paint-status";
        paintStatus.textContent =
          action === "send" ? "Moviendo a pintura…" : "Registrando pintado…";
      }

      try {
        const response = await fetch("/admin/api/paint", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Error al mover pintura");
        }

        const verb = action === "send" ? "Mandaste a pintar" : "Volvió pintado";
        const message = data.syncError
          ? `${verb} ${payload.qty}. Recalcular falló: ${data.syncError}`
          : `${verb} ${payload.qty}.`;

        if (paintStatus) {
          paintStatus.className = data.syncError ? "paint-status is-warn" : "paint-status is-ok";
          paintStatus.textContent = message;
        }

        setTimeout(() => window.location.reload(), 900);
      } catch (error) {
        if (paintStatus) {
          paintStatus.className = "paint-status is-err";
          paintStatus.textContent = error.message || "Error";
        }
        buttons.forEach((btn) => {
          btn.disabled = false;
        });
      }
    });
  }
})();
