# Arquitectura

## Diagrama lógico

```
Visitante
    │
    ├─ HTML/CSS/JS (cPanel public_html)
    │     nav.js, shopify-global.js, shopify-products.js,
    │     shopify-hide-unavailable.js
    │
    ├─ Buy Button (CDN Shopify) ── Storefront API ── Tienda v4apub-im.myshopify.com
    │     token público en shopify-global.js
    │     checkout → Shopify (pago, envío, orden)
    │
    └─ Formulario contacto ── POST enviar.php ── SMTP (config.mail.php)

Operador
    │
    └─ /admin (Vercel) ── Express (api/index.js + lib/)
              │
              ├─ Shopify Admin GraphQL (client credentials)
              ├─ Webhooks HMAC (orders/paid, refunds, cancelled)
              └─ WhatsApp Cloud API (opcional, alertas)
```

## Sitio público

- **Stack:** HTML, CSS duplicado (`pagina3/style.css` en Home; `style.css` raíz en `/armado/`; hojas propias en pérgolas, contacto, FAQ, fences), JS vanilla, PHP solo para contacto.
- **Rutas:** `.htaccess` (HTTPS, no-www). Públicas: `/`, `/pergolas/`, `/contacto/`, `/preguntas-frecuentes/`, `/catalogo/`, `/armado/…`, `/gracias.html`, `/fences/`.
- **Navbar/footer:** HTML copiado por página. `nav.js` no los inyecta. Guías de armado (`armado/sillon-*.html`, etc.) no tienen nav, footer ni carrito.
- **Deploy:** `.cpanel.yml` rsync a `/home/alucraf1/public_html/`. No vacía el destino. No sube `shopify-inventory-sync/` ni `_bmad/`.
- **Carrito:** `shopify-global.js` crea un drawer (`popup: false`) anclado a `#navCartToggle`. Está en Home, pérgolas, contacto, FAQ, gracias, hub de armado. **No** está en fences ni en fichas de armado. Productos Buy Button solo en `index.html` (`shopify-products.js` + `shopify-hide-unavailable.js`).
- **No hay README en la raíz del repo.** El README de inventario vive en `shopify-inventory-sync/README.md`.

No hay autenticación de clientes en el sitio.

## App de inventario (`shopify-inventory-sync/`)

- **Runtime:** Node, Express, desplegado como serverless Vercel (`vercel.json`).
- **Entrada:** `api/index.js` monta rutas admin, webhooks, health.
- **Modo:** `INVENTORY_SYNC_MODE=components` (default en código). `legacy` solo recalcula juego desde stock de terminados.
- **Admin:** HTML generado en `lib/views/adminPages.js`, CSS/JS en `public/admin/`. Versión de assets `ADMIN_ASSET_V` para cache-bust.
- **Auth admin:** `ADMIN_USERNAME` + `ADMIN_PASSWORD` + `SESSION_SECRET`. Cookie `alucraft_admin` (`cookie-session`, 7 días, `httpOnly`; `secure` en producción/Vercel). `trust proxy` habilitado.
- **Shopify Admin:** `lib/shopifyAdmin.js`. Client credentials (preferido) o token estático. La página `/` con `host`/`hmac` es landing de instalación; **no** registra webhooks sola.
- **BOM:** 12 piezas de estructura en `lib/bom/pieces.js` + almohadones, cajas, `LLAVE-ALLEN`.
- **Sync vitrina:** `lib/syncAllStock.js` (components) o `lib/syncJuegoStock.js` (legacy).
- **Último sync en el panel:** `lib/syncState.js` (memoria; se pierde en cold start).
- **Idempotencia webhook:** tags Shopify + Maps en memoria (`processedOrders.js`, `processedWebhooks.js`). Cold start borra los Maps.
- **Tests:** scripts `assert` (`npm run test-pieces`, etc.). No hay Jest/Mocha.
- **Alertas:** WhatsApp opcional (Twilio o Cloud API), cooldown 6 h en memoria. Umbrales `ALERT_THRESHOLD_*` (defaults 4/2/2/2/1 para S1/S3/mesa/reposera/juego).

## Datos

| Dato | Dónde vive |
|---|---|
| Precios, títulos, imágenes de vitrina | Shopify (productos publicados) |
| Stock vitrina | Shopify inventory de esos productos |
| Stock físico piezas/telas/cajas | Shopify inventory de productos draft/unpublished |
| Recetas BOM | Código (`lib/bom/`) |
| Umbrales alerta | Env (`ALERT_THRESHOLD_*`) + defaults en código |
| Leads de contacto | Email SMTP, no persistidos en repo |
| Sesión admin | Cookie, no DB |

## Seguridad (hechos del repo)

- Storefront token en JS: **público por diseño** (Buy Button). No es Admin API.
- Admin API secrets: `.env` gitignored.
- Webhooks: verificación HMAC (`SHOPIFY_WEBHOOK_SECRET`).
- Contacto: honeypot `website`, timestamp `form_start`, sanitización básica.
- `config.mail.php` no está en git; sí `config.mail.example.php`.

UNKNOWN: rotación del token storefront, scopes exactos de la app Admin en producción, `SameSite` de la cookie admin.

## Rendimiento / SEO (verificado en repo)

- Sin `robots.txt` ni sitemap versionados. Casi sin Open Graph. Un canonical: stub `armado/armado.html`.
- Tag Google Ads `AW-11148252614` en páginas principales; conversión en `gracias.html`.
- PDF catálogo ~7.9 MB; PNGs de armado ~0.8–1.2 MB; galería pérgolas ~11 MB. Home no usa `loading="lazy"` en las fotos de contexto; el HTML del catálogo sí.
- `fotosSeleccionadas/paralax.webp` no está referenciado por HTML/CSS/JS del sitio (candidato a muerto; no borrar sin comprobar hosting).
