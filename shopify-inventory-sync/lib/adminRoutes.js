const path = require("path");
const express = require("express");
const { getAdminConfig, validateCredentials, requireAdmin, isAdminConfigured } = require("./auth");
const { getAlertThresholds, getWhatsAppConfig, getShopifyPendingOrdersUrl } = require("./config");
const { getDashboardStockSummary } = require("./dashboardData");
const { getLastSync, recordSync } = require("./syncState");
const { runInventorySync } = require("./inventorySync");
const { checkAndSendStockAlerts } = require("./alerts/stockAlerts");
const { sendWhatsAppMessage } = require("./alerts/whatsapp");
const { renderLoginPage, renderDashboardPage } = require("./views/adminPages");

function whatsappStatusLabel() {
  const cfg = getWhatsAppConfig();
  if (!cfg.provider) return "No configurado";
  if (cfg.misconfigured) return "Incompleto";
  if (cfg.unknownProvider) return "Proveedor inválido";
  if (cfg.enabled) return `Activo (${cfg.provider})`;
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
      const stock = await getDashboardStockSummary();

      return res.status(200).send(
        renderDashboardPage({
          stock,
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
