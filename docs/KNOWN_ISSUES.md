# Problemas conocidos

Clasificación: impacto si se explota o se opera mal vs evidencia en código/docs. No se “limpió” nada en esta fase.

## CRITICAL

| ID | Tema | Evidencia | Notas |
|---|---|---|---|
| C1 | Deploy Vercel + webhooks | Cerrado 2026-08-28: proyecto `temporary-snappy-walnut-fsw66dt`, health OK, `/admin` login OK, 3 webhooks GraphQL apuntando a esa URL. HMAC de esas suscripciones usa `SHOPIFY_CLIENT_SECRET` (`getWebhookSecret`). GitHub conectado; Root Directory `shopify-inventory-sync`. | **Hecho.** C3 sigue valiendo: la próxima venta reescribe vitrina. Commitear el HMAC/scripts antes de pushear `main`, si no el próximo deploy Git vuelve al código viejo. |
| C2 | Recalcular pisa vitrina | `syncAllStock` → `setAvailableQuantity` a fabricable BOM | Operación: cargar Natural / pintar **sin** Recalcular es intencional. Un Recalcular “por las dudas” puede poner en 0 stock de tienda que se ajustó a mano (p. ej. todo a Inclinado). |
| C3 | Un pedido pagado también pisa vitrina | `handleOrderPaid` llama `runInventorySync()` siempre (si no skip) | Evitar el botón Recalcular **no** protege la vitrina: la **próxima venta** (o refund) reescribe todos los terminados al fabricable BOM. Si webhooks están vivos y el BOM pintado es 0, la tienda puede ir a 0 sola. |

## HIGH

| ID | Tema | Evidencia |
|---|---|---|
| H1 | Doble verdad de stock | Panel Tienda = BOM; Buy Button = qty Shopify de terminados. Divergen hasta Recalcular o webhook. |
| H2 | Sobre-conteo por tela | `sharedStructureAllocation.js`: cada variante de tela muestra máximo individual; Recalcular **escribe** eso. Suma de variantes puede superar piezas. `allocateSharedStructurePool` no se usa. |
| H3 | Tag antes de descontar | `claimOrderForProcessing` taguea `alucraft-inventory-synced` y recién después descuenta. Crash intermedio → pedido “ya sync” sin descuento. Sin `write_orders` → tag falla y dedup queda en memoria (cold start = posible doble descuento). |
| H4 | Dedup en memoria | `processedOrders.js` y `processedWebhooks.js`: Map de proceso. Serverless no comparte estado. |
| H5 | Contrato de envío | Carrito: “Envio Gratis a TODO el país” (`shopify-global.js`). FAQ: costo/plazo en checkout. Ticket alto + desconfianza. Verdad comercial **a confirmar con Juan**. |
| H6 | Cache JS Buy Button | `shopify-global.js` / `shopify-products.js` sin query `?v=`. Spec deferred: HTML nuevo + JS viejo puede duplicar carrito. |
| H7 | Tab Tienda no lee vitrina | `getDashboardBomView` calcula BOM. El copy implica “lo que ve el cliente”. Sin sync reciente, el operador puede creer que la tienda ya cambió. |

## MEDIUM

| ID | Tema | Evidencia |
|---|---|---|
| M1 | README inventario desactualizado | Sigue presentando fórmula Juego legacy como el flujo default; el código `components` usa BOM. |
| M2 | `fences/multimedia/hero.jpg` 404 | `deferred-work.md` + CSS de fences. |
| M3 | `gracias.html` huérfana de marca; redes `#` | Auditoría UX 2026-08-24. |
| M4 | Overflow mobile / copy cortado | Auditoría UX; `body { overflow-x: hidden }`. |
| M5 | CSS navbar copiado en varias páginas | Auditoría UX. |
| M6 | rsync `.htaccess` vs MultiPHP | `deferred-work.md`. |
| M7 | Token storefront en JS | Público por diseño Buy Button; rotación/scopes **UNKNOWN**. |
| M8 | Sin `robots.txt` / sitemap en repo | Búsqueda en el árbol: no hay. SEO en producción **UNKNOWN**. |
| M9 | Script `move-current-stock-to-inclinado.js` untracked | Ya ejecutado contra Shopify según historial de chat; re-ejecutar sería destructivo. |
| M10 | Pieza `RES-REP` agregada tarde | Carga Natural de reposeras pudo omitir respaldos. **NEEDS VERIFICATION** en depósito. |
| M11 | `$DEBUG` en `enviar.php` | Hoy `false`; si se deja `true` en prod, filtra errores SMTP. |
| M12 | README webhooks incompleto | `orders/cancelled` en código; no está en el setup del README. Contradicción `read_orders`. |
| M13 | Admin password en texto plano | `ADMIN_PASSWORD` en env, sin hash ni rate limit de login. |
| M14 | CSS Home vs armado divergentes | `pagina3/style.css` (~18 KB) vs `style.css` raíz (~14 KB). Navbar copiada. |
| M15 | `fotosSeleccionadas/paralax.webp` | Sin referencias en HTML/CSS/JS del sitio. |
| M16 | PDF / assets pesados | Catálogo ~7.9 MB; sin OG/Twitter; Google Ads sí está. |
| M17 | Spec UX `ux-home-acceso.md` | Estado **proposed**, no implementada. |

## LOW

| ID | Tema | Evidencia |
|---|---|---|
| L1 | `DESIGN.md` / `EXPERIENCE.md` UX vacíos | Solo frontmatter; la auditoría vive en `auditoria-ux-ui.md`. |
| L2 | Copy “Envio” sin tilde | `shopify-global.js`. |
| L3 | PHPMailer completo en repo | Vendorizado; no es secreto. |
| L4 | AGENTS.md BMAD no generado | `bmad-project-context` requiere aprobación explícita del bloque. |
| L5 | Código muerto `allocateSharedStructurePool` | Exportado, cero callers. No borrar hasta decidir política de stock por tela. |

## Seguridad — lo que NO se encontró en git

- `config.mail.php` y `.env` gitignored.
- `.htaccess` bloquea HTTP a `config.mail.php`, `error_log`, `.env`, `.git`.
- Admin: `ADMIN_USERNAME` + `ADMIN_PASSWORD` + `SESSION_SECRET`; cookie `httpOnly` + `secure` en producción (`trust proxy`).
- No hay `shpat_` / secrets Admin en el JS del sitio. Unico token commiteado: Storefront de Buy Button (público por diseño). `config.mail.php` existe en disco local (gitignored); contenido **no inspeccionado**.

UNKNOWN: fuerza de `SESSION_SECRET` en Vercel, 2FA Shopify, si el token Admin tiene más scopes de los necesarios.

## No clasificado como bug (comportamiento)

- Pintura y Cargar depósito no sincronizan vitrina: **diseño**.
- Piezas unpublished: **diseño**.
- Checkout 100% Shopify: **diseño**.
- Cupón CAMI no está en el sitio: **Shopify Admin**.
