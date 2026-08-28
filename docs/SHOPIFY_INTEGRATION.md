# Integración Shopify

Tienda: `v4apub-im.myshopify.com`. Location de inventario usada en sync: `78760968270` (configurable por env).

## Storefront / Buy Button (sitio público)

- Scripts: `shopify-global.js`, `shopify-products.js`, `shopify-hide-unavailable.js`.
- SDK: Shopify Buy Button (CDN).
- Token: storefront **público** embebido en `shopify-global.js` (necesario para el widget; no es el Admin token).
- Destino del botón en cards: `buttonDestination: "modal"` (“Ver Producto”); juego en layout `full`: “Agregar al carrito” inline.
- Carrito: drawer, botón “Pagar”. Dominio custom de checkout: **UNKNOWN** (no está en el JS del sitio). FAQ menciona Mercado Pago.
- IDs montados en Home: juego `7842687025230`, S1 `7840729497678`, S3 `7842184069198`, reposera `7842184888398`, mesa `7842184167502`.

El sitio **no** llama Admin API. No hay lógica de cupón/descuento en JS ni PHP públicos.

## Admin API (app Vercel)

- Auth: client credentials (env: shop, client id/secret o token — ver `.env.example` en `shopify-inventory-sync/`).
- Operaciones típicas: leer productos/variantes, `inventorySetQuantities` / available, webhooks.
- Productos pieza: draft, no publicados en Online Store.

## Webhooks

Estado 2026-08-28: 3 suscripciones en la app (`orders/paid`, `refunds/create`, `orders/cancelled`) → `https://temporary-snappy-walnut-fsw66dt.vercel.app/webhooks/…`. HMAC con `SHOPIFY_CLIENT_SECRET`. Settings → Notifications de la tienda puede tener hooks extra (**UNKNOWN**).

| Topic | Ruta Express | Rol |
|---|---|---|
| `orders/paid` | `POST /webhooks/orders-paid` | Descontar BOM + sync vitrina |
| `refunds/create` | `POST /webhooks/refunds-create` | Reponer si hay restock + sync |
| `orders/cancelled` | `POST /webhooks/orders-cancelled` | Reponer + sync (fallback a `line_items` si no hay líneas de refund) |

HMAC con `SHOPIFY_WEBHOOK_SECRET`. Tags: `alucraft-inventory-synced` (pago), `alucraft-inventory-restocked` (reposición). Refunds respetan `no_restock`. El README de la app documenta dos URLs; `orders/cancelled` está en código y **falta en los pasos de setup**. Contradicción extra en README: a veces pide `read_orders` y en otro párrafo dice que no.

## Qué datos son de Shopify vs de la app

| Shopify | App (código + env) |
|---|---|
| Catálogo, precios, media, checkout, clientes, órdenes | Recetas BOM, umbrales, UI admin, reglas de pintura, sync |
| Inventory levels | Quién escribe esos levels (panel, webhook, Recalcular) |

## Apps / descuentos / envíos

Fuera de este repositorio. CAMI, tarifas de envío, impuestos: Admin Shopify.

## Prohibiciones operativas (comportamiento actual a preservar)

- No publicar productos pieza / almohadón / caja en el storefront.
- No cambiar IDs públicos de los 5 terminados sin decisión explícita.
- No Recalcular “por las dudas” después de carga Natural o envío a pintura si la vitrina se está manteniendo a mano. Un pedido pagado dispara el mismo overwrite.
