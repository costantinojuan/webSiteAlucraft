# Deployment

## Sitio público — cPanel

- Dominio: `https://alucraft.com.ar` (`.htaccess`: HTTPS, sin www, URLs limpias).
- Git Version Control de cPanel + `.cpanel.yml`.
- Rsync **no vacía** `public_html`: solo copia paths listados (HTML, CSS, JS, PHPMailer, `armado`, `catalogo`, `fences`, fotos, etc.).
- **No** despliega `shopify-inventory-sync/`, `_bmad/`, ni `docs/`.
- `config.mail.php` no está en git: debe existir en el hosting (ejemplo: `config.mail.example.php`).
- `.htaccess` versionado se rsync-ea: puede pisar el bloque MultiPHP que cPanel inyecta (`deferred-work.md`). Si PHP deja de servir tras un deploy, restaurar handler en MultiPHP.

Clone sucio en cPanel deja Deploy deshabilitado hasta `git status` limpio.

## App inventario — Vercel + GitHub

- Código: `shopify-inventory-sync/` (Express `@vercel/node`, `vercel.json` rutea todo a `api/index.js`).
- Repo Git: `https://github.com/costantinojuan/webSiteAlucraft.git` (monorepo: sitio + app).
- Deploy: proyecto Vercel `temporary-snappy-walnut-fsw66dt` (cuenta Juan Costantino), enlazado en local. URL: `https://temporary-snappy-walnut-fsw66dt.vercel.app`. Health OK (2026-08-28).
- Env de producción: cargadas desde `.env` local (13 keys). No están en git.
- Root Directory: la app vive en `shopify-inventory-sync/` (CLI se corre desde esa carpeta).
- **GitHub ↔ Vercel:** conectado 2026-08-28 al repo `costantinojuan/webSiteAlucraft`. Root Directory = `shopify-inventory-sync` (el sitio estático sigue en cPanel). Un push a `main` redeploya **solo** la app de inventario. El código C1 (HMAC, scripts, docs) todavía no está en GitHub: un push de `main` tal como está hoy **no** incluye ese arreglo hasta que se commitee.

Webhooks de esta app (Admin API, 2026-08-28):

- `https://temporary-snappy-walnut-fsw66dt.vercel.app/webhooks/orders-paid`
- `https://temporary-snappy-walnut-fsw66dt.vercel.app/webhooks/refunds-create`
- `https://temporary-snappy-walnut-fsw66dt.vercel.app/webhooks/orders-cancelled`

HMAC: client secret de la app (`SHOPIFY_CLIENT_SECRET`), no el signing secret corto de Notifications.

## Git

- Remote único: `origin` → `https://github.com/costantinojuan/webSiteAlucraft.git`. Sin submódulos.
- `main` reciente (más nuevo primero): Herramientas Allen `cfaa5a3`; cache-bust tabs depósito `d2ab38b`; `RES-REP` + carga por color `155d38f`; cargar depósito `abbc017`; taller pintura `c2a4fcb`; laterales recto/inclinado `60b76ff`.
- Otras ramas locales (no necesariamente en remote): `experimentos`, `fix/unify-shopify-home-cart`, `chore/cpanel-git-deploy`, ramas UX, etc.
- Esta fase de docs **no** hizo commit. Había cambios locales de admin y el script untracked `move-current-stock-to-inclinado.js`. No se destruyó historial.

## Qué no está automatizado en el repo

- CI/CD GitHub Actions: no encontrado en el relevamiento.
- Tests inventario: `npm run test-pieces` y scripts `test-order-deduct.js` / `test-refund-restock.js` (estos últimos necesitan `.env`).
- Registro de webhooks: manual.
- Deploy del sitio: Git de cPanel. `config.mail.php` hay que mantenerlo en el server (no viaja en rsync del ejemplo).

## PHP

`enviar.php` + PHPMailer vendorizado en `PHPMailer/`. Versión de PHP en cPanel: **UNKNOWN** (riesgo MultiPHP).
