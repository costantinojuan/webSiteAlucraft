const path = require("path");
const express = require("express");
const { getAdminConfig, validateCredentials, requireAdmin, isAdminConfigured } = require("./auth");
const { getAlertThresholds, getWhatsAppConfig, getShopifyPendingOrdersUrl, getSyncConfig } = require("./config");
const { getDashboardStockSummary } = require("./dashboardData");
const { getDashboardBomView } = require("./dashboardBomView");
const { getLastSync, recordSync } = require("./syncState");
const { runInventorySync } = require("./inventorySync");
const { checkAndSendStockAlerts } = require("./alerts/stockAlerts");
const { sendWhatsAppMessage } = require("./alerts/whatsapp");
const { renderLoginPage, renderDashboardPage, formatDateTime } = require("./views/adminPages");
const { renderPrintCodesPage } = require("./views/adminPaintPages");
const { buildPaintDeltas, buildPaintBatchDeltas } = require("./bom/paint");
const { applyInventoryDeltas } = require("./bom/applyInventoryDeltas");
const { codesCatalog } = require("./paintWorkshop");
const { applyStockAdjust } = require("./bom/stockAdjust");

function whatsappStatusLabel() {
  const cfg = getWhatsAppConfig();
  const provider = process.env.WHATSAPP_PROVIDER?.trim().toLowerCase() || "";

  if (!provider) {
    return "No configurado — agregá WHATSAPP_PROVIDER y WHATSAPP_TO en Vercel";
  }
  if (!process.env.WHATSAPP_TO?.trim()) {
    return "Incompleto — falta WHATSAPP_TO";
  }
  if (cfg.unknownProvider) {
    return `Proveedor inválido (${provider}) — usá twilio o cloud_api`;
  }
  if (cfg.misconfigured) {
    if (cfg.provider === "twilio") {
      return "Incompleto — faltan TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN o TWILIO_WHATSAPP_FROM";
    }
    if (cfg.provider === "cloud_api") {
      return "Incompleto — faltan WHATSAPP_CLOUD_TOKEN o WHATSAPP_CLOUD_PHONE_NUMBER_ID";
    }
  }
  if (cfg.enabled) {
    return `Activo (${cfg.provider})`;
  }
  return "No configurado";
}

async function runSyncWithAlerts(source) {
  const syncResult = await runInventorySync();
  recordSync(syncResult, source);

  const stock = await getDashboardStockSummary();
  const alertResult = await checkAndSendStockAlerts(stock.products);

  return { syncResult, alertResult, stock };
}

function createAdminRouter() {
  const router = express.Router();

  router.get("/login", (req, res) => {
    if (!isAdminConfigured()) {
      return res.status(503).send("Admin no configurado");
    }
    if (req.session?.admin) {
      return res.redirect("/admin");
    }
    const nextUrl = req.query.next || "/admin";
    let error = null;
    if (req.query.session === "expired") {
      error = "La sesión no se guardó. Probá de nuevo tras el último deploy.";
    }
    return res.status(200).send(renderLoginPage({ error, nextUrl }));
  });

  router.post("/login", express.urlencoded({ extended: false }), (req, res) => {
    if (!isAdminConfigured()) {
      return res.status(503).send("Admin no configurado");
    }

    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "").trim();
    const nextUrl = req.body.next || "/admin";

    if (!validateCredentials(username, password)) {
      return res.status(200).send(
        renderLoginPage({ error: "Usuario o contraseña incorrectos.", nextUrl })
      );
    }

    req.session = { admin: true, username };
    const destination = nextUrl.startsWith("/admin") ? nextUrl : "/admin";
    return res.redirect(303, destination);
  });

  router.post("/logout", requireAdmin, (req, res) => {
    req.session = null;
    return res.redirect("/admin/login");
  });

  router.get("/", requireAdmin, async (req, res) => {
    try {
      const [stock, bomView] = await Promise.all([
        getDashboardStockSummary(),
        getDashboardBomView(),
      ]);

      return res.status(200).send(
        renderDashboardPage({
          stock,
          bomView,
          lastSync: getLastSync(),
          thresholds: getAlertThresholds(),
          whatsappStatus: whatsappStatusLabel(),
          whatsappEnabled: getWhatsAppConfig().enabled,
          shopifyOrdersUrl: getShopifyPendingOrdersUrl(),
        })
      );
    } catch (error) {
      console.error("Dashboard error", error);
      return res.status(500).send(`Error cargando dashboard: ${error.message}`);
    }
  });

  router.post("/api/sync", requireAdmin, async (req, res) => {
    try {
      const { syncResult, alertResult } = await runSyncWithAlerts("manual");

      return res.status(200).json({
        ok: true,
        synced: syncResult,
        alerts: alertResult,
        lastSync: getLastSync(),
      });
    } catch (error) {
      console.error("Manual sync error", error);
      return res.status(500).json({
        ok: false,
        error: error.message,
      });
    }
  });

  router.get("/pintura/codigos", requireAdmin, (req, res) => {
    return res.status(200).send(
      renderPrintCodesPage({
        pieces: codesCatalog(),
        printedAt: formatDateTime(new Date().toISOString()),
      })
    );
  });

  router.post("/api/paint", requireAdmin, express.json(), async (req, res) => {
    try {
      const action = req.body?.action;
      const deltas = Array.isArray(req.body?.lines)
        ? buildPaintBatchDeltas({ action, lines: req.body.lines })
        : buildPaintDeltas({
            pieceKey: req.body?.pieceKey,
            color: req.body?.color,
            qty: req.body?.qty,
            action,
          });

      const applied = await applyInventoryDeltas(deltas, getSyncConfig());

      return res.status(200).json({
        ok: true,
        applied,
        lastSync: getLastSync(),
      });
    } catch (error) {
      console.error("Paint error", error);
      const status = /insuficiente|desconocid|inválid|invalida|cantidad|Marcá/i.test(error.message)
        ? 400
        : 500;
      return res.status(status).json({
        ok: false,
        error: error.message,
      });
    }
  });

  router.post("/api/stock", requireAdmin, express.json(), async (req, res) => {
    try {
      const applied = await applyStockAdjust(
        {
          mode: req.body?.mode,
          lines: req.body?.lines,
        },
        getSyncConfig()
      );

      return res.status(200).json({
        ok: true,
        applied,
      });
    } catch (error) {
      console.error("Stock adjust error", error);
      const status = /insuficiente|desconocid|inválid|invalida|cantidad|Marcá|Falta|negativa|modo/i.test(
        error.message
      )
        ? 400
        : 500;
      return res.status(status).json({
        ok: false,
        error: error.message,
      });
    }
  });

  router.post("/api/test-whatsapp", requireAdmin, async (req, res) => {
    const cfg = getWhatsAppConfig();
    if (!cfg.enabled) {
      return res.status(400).json({
        ok: false,
        error: "WhatsApp no configurado. Agregá las variables en Vercel y redeploy.",
      });
    }

    try {
      const result = await sendWhatsAppMessage(
        "Prueba de alerta Alucraft.\nSi recibís este mensaje, WhatsApp está configurado correctamente."
      );
      return res.status(200).json({ ok: true, result });
    } catch (error) {
      console.error("WhatsApp test error", error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}

function isProduction() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

function mountAdmin(app) {
  const config = getAdminConfig();

  if (config) {
    const cookieSession = require("cookie-session");
    app.use(
      cookieSession({
        name: "alucraft_admin",
        keys: [config.sessionSecret],
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction(),
        path: "/",
      })
    );
  }

  app.use(
    "/admin/static",
    express.static(path.join(__dirname, "..", "public", "admin"), {
      maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
    })
  );

  app.use("/admin", createAdminRouter());
}

module.exports = { mountAdmin, runSyncWithAlerts };
