(function () {
  const syncBtn = document.getElementById("sync-btn");
  const syncResult = document.getElementById("sync-result");

  function formatVariantResults(synced) {
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

  if (syncBtn && syncResult) {
    syncBtn.addEventListener("click", async () => {
      syncBtn.disabled = true;
      syncResult.hidden = false;
      syncResult.className = "sync-result";
      syncResult.textContent = "Recalculando stock…";

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
          `<strong>Stock recalculado correctamente.</strong>${alertNote}<br>` +
          formatVariantResults(data.synced?.synced);
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
