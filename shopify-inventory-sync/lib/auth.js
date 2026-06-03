const crypto = require("crypto");

function getAdminConfig() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();
  const sessionSecret = process.env.SESSION_SECRET?.trim();

  if (!username || !password || !sessionSecret) {
    return null;
  }

  return { username, password, sessionSecret };
}

function isAdminConfigured() {
  return getAdminConfig() !== null;
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function validateCredentials(username, password) {
  const config = getAdminConfig();
  if (!config) {
    return false;
  }
  return (
    timingSafeEqual(username, config.username) && timingSafeEqual(password, config.password)
  );
}

function requireAdmin(req, res, next) {
  if (!isAdminConfigured()) {
    return res.status(503).type("html").send(adminNotConfiguredPage());
  }

  if (req.session?.admin === true) {
    return next();
  }

  if (req.path.startsWith("/admin/api/")) {
    return res.status(401).json({ ok: false, error: "No autorizado" });
  }

  const nextUrl = encodeURIComponent(req.originalUrl || "/admin");
  return res.redirect(`/admin/login?next=${nextUrl}`);
}

function adminNotConfiguredPage() {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin no configurado</title></head>
<body style="font-family:system-ui;max-width:28rem;margin:3rem auto;padding:0 1rem;color:#334155">
  <h1>Panel admin no disponible</h1>
  <p>Configurá <code>ADMIN_USERNAME</code>, <code>ADMIN_PASSWORD</code> y <code>SESSION_SECRET</code> en Vercel.</p>
</body></html>`;
}

module.exports = {
  getAdminConfig,
  isAdminConfigured,
  validateCredentials,
  requireAdmin,
  adminNotConfiguredPage,
};
