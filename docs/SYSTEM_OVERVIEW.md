# Visión general del sistema

**Alucraft** es un sitio de comercio de mobiliario de aluminio (living exterior, pérgolas, cercos) más una app de inventario que sincroniza stock con Shopify.

No hay una única aplicación: hay **dos superficies** con hosting distinto.

## Qué ve el cliente

Sitio estático en **alucraft.com.ar** (cPanel):

- Home (`index.html`)
- Pérgolas (`pagina2/pergolas.html` → URL limpia `/pergolas/`)
- Contacto (`pagina4/contacto.html` → `/contacto/`) + `enviar.php` (PHPMailer)
- FAQ (`pagina5/preguntas.html` → `/preguntas-frecuentes/`)
- Catálogo (`catalogo/mobiliario.html` → `/catalogo/`; PDF `Alucraft-Outdoor-Living-2026.pdf`)
- Manuales de armado (`armado/` + guías por producto **sin** carrito)
- Cercos (`fences/`): línea aparte, **sin** Buy Button; cotización WhatsApp
- Página de gracias post-formulario (`gracias.html`, sin URL limpia)

El carrito y el checkout **no son propios**: Shopify Buy Button JS + checkout Shopify (Mercado Pago u otros métodos configurados **en Shopify**, no en este repo).

**No hay base de datos en el sitio.** Productos, precios, variantes y stock de vitrina viven en Shopify.

## Qué ve el operador

App Express en `shopify-inventory-sync/` (Vercel):

- Admin `/admin` (sesión cookie `alucraft_admin`)
- Depósito (piezas Natural / pintadas / WIP / almohadones / cajas / herramientas)
- Cargar depósito (ajuste de inventario Admin API)
- Pintura (enviar a taller, recibir pintado, imprimir códigos)
- Tienda (stock fabricable vs umbrales)
- Recalcular (escribe cantidades de productos **terminados** publicados)
- Webhooks `orders/paid`, `refunds/create`, `orders/cancelled`

Piezas, almohadones y cajas son productos Shopify **no publicados** en el canal Online Store. No deben publicarse.

## Fuente de verdad (importante)

Hay **dos cantidades** que pueden divergir:

1. **Componentes** (piezas, telas, cajas): inventario físico en variantes no publicadas. Lo mueve el panel (carga, pintura) y los webhooks de venta/reembolso.
2. **Vitrina** (S1, S3, mesa, reposera, juego publicados): lo que el Buy Button muestra como disponible. Lo **sobrescribe** Recalcular y el sync post-webhook. **No** lo actualizan Cargar depósito ni Pintura.

Si se carga Natural y no se Recalcula, el dashboard Tienda (BOM) y la tienda pública pueden no coincidir. Eso es comportamiento actual, no un bug de cálculo aislado.

## Dominio de producto (terminados publicados)

IDs fijos (no cambiar sin pedido explícito):

| Producto | Product ID |
|---|---|
| Sillón 1 cuerpo | `7840729497678` |
| Sillón 3 cuerpos | `7842184069198` |
| Mesa ratona | `7842184167502` |
| Juego Living Exterior | `7842687025230` |
| Reposera | `7842184888398` |

Variantes de sillones y juego: `Estructura / Tela / Recto|Inclinado`. Mesa y reposera: `Estructura / Tela` (sin estilo de patas).

Juego Living no es un SKU físico propio: es un **bundle de receta** (2× S1 + 1× S3 + 1× mesa) calculado desde componentes (modo `components`).

## Lo que este repo no contiene

- Configuración de descuentos Shopify (cupón CAMI: **UNKNOWN** si es automático o código; no está en JS del sitio).
- Credenciales de producción (`.env` gitignored; `config.mail.php` gitignored).
- Panel Shopify Admin (precios, envíos, pagos, apps).

## UNKNOWN / NEEDS VERIFICATION

- URL viva: `https://temporary-snappy-walnut-fsw66dt.vercel.app` (health + admin login OK, 2026-08-28).
- GitHub → Vercel auto-deploy: **sí**, repo `costantinojuan/webSiteAlucraft`, root `shopify-inventory-sync`.
- Webhooks de esta app: 3, apuntando a esa URL.
- Estado de MultiPHP / `.htaccess` en cPanel vs lo versionado.
- Si Recalcular se usó después de cargas Natural recientes.
