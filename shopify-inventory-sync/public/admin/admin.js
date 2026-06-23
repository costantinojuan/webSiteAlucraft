(function () {
  const syncBtn = document.getElementById("sync-btn");
  const syncResult = document.getElementById("sync-result");

  const PRODUCT_LABELS = {
    sillon1: "Sillón 1",
    sillon3: "Sillón 3",
    mesa: "Mesa Ratona",
    reposera: "Reposera",
    juego: "Juego Living",
  };

  function formatLegacyJuegoResults(synced) {
    if (!Array.isArray(synced) || synced.length === 0) {
      return "No hubo variantes para actualizar.";
    }

    return synced
      .map((row) => {
        const prev = row.juego?.previousAvailable ?? "?";
        const next = row.juego?.calculated ?? row.juego?.available ?? "?";
        return `${row.juegoVariant}: ${prev} → ${next}`;
      })
      .join("<br>");
  }

  function formatComponentsResults(syncResult) {
    const sections = [];

    for (const [key, product] of Object.entries(syncResult.products || {})) {
      if (!product?.synced?.length) {
        continue;
      }

      const label = PRODUCT_LABELS[key] || key;
      const rows = product.synced
        .map((row) => {
          const prev = row.previousAvailable ?? "?";
          const next = row.calculated ?? row.available ?? "?";
          const bottleneck = row.bottleneck
            ? ` · cuello: ${row.bottleneck.label} (${row.bottleneck.available})`
            : "";
          return `${row.variant}: ${prev} → ${next}${bottleneck}`;
        })
        .join("<br>");

      sections.push(`<strong>${label}</strong><br>${rows}`);
    }

    return sections.length > 0 ? sections.join("<br><br>") : "No hubo variantes para actualizar.";
  }

  function formatSyncResults(syncResult) {
    if (!syncResult) {
      return "Sin detalle de sincronización.";
    }

    if (syncResult.mode === "components") {
      return formatComponentsResults(syncResult);
    }

    return formatLegacyJuegoResults(syncResult.synced);
  }

  if (syncBtn && syncResult) {
    syncBtn.addEventListener("click", async () => {
      syncBtn.disabled = true;
      syncResult.hidden = false;
      syncResult.className = "sync-result";
      syncResult.textContent = "Recalculando inventario…";

      try {
        const response = await fetch("/admin/api/sync", {
          method: "POST",
          headers: { Accept: "application/json" },
          credentials: "same-origin",
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Error al recalcular stock");
        }

        syncResult.className = "sync-result alert-success";
        const alertNote = data.alerts?.sent
          ? " Se envió alerta de WhatsApp."
          : data.alerts?.lowCount
            ? " Hay stock bajo (WhatsApp no enviado o en cooldown)."
            : "";

        syncResult.innerHTML =
          `<strong>Inventario recalculado correctamente.</strong>${alertNote}<br><br>` +
          formatSyncResults(data.synced);
      } catch (error) {
        syncResult.className = "sync-result alert-error";
        syncResult.textContent = error.message || "No se pudo recalcular el stock.";
      } finally {
        syncBtn.disabled = false;
      }
    });
  }

  const whatsappBtn = document.getElementById("whatsapp-test-btn");
  const whatsappResult = document.getElementById("whatsapp-test-result");

  if (whatsappBtn && whatsappResult) {
    whatsappBtn.addEventListener("click", async () => {
      whatsappBtn.disabled = true;
      whatsappResult.textContent = "Enviando prueba…";

      try {
        const response = await fetch("/admin/api/test-whatsapp", {
          method: "POST",
          headers: { Accept: "application/json" },
          credentials: "same-origin",
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Error al enviar WhatsApp");
        }

        whatsappResult.textContent = "Mensaje enviado. Revisá tu WhatsApp.";
      } catch (error) {
        whatsappResult.textContent = error.message || "No se pudo enviar.";
      } finally {
        whatsappBtn.disabled = false;
      }
    });
  }
})();
