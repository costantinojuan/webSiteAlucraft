# Shopify Inventory Sync — Juego Living Exterior

Mini app Node.js + Express que recalcula el stock del **Juego Living Exterior** cuando Shopify envía el webhook `orders/paid`.

Usa **Shopify Admin GraphQL API** (no REST deprecado).

## Fórmula

```js
stockJuego = Math.min(
  Math.floor(stockSillon1 / 2),
  stockSillon3,
  stockMesa
);
```

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `SHOPIFY_STORE_DOMAIN` | `tu-tienda.myshopify.com` (sin `https://`) |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | Token de app custom (Admin API) |
| `SHOPIFY_WEBHOOK_SECRET` | Secret del webhook (Settings → Notifications) |
| `LOCATION_ID` | ID numérico de la ubicación de inventario |
| `VARIANT_ID_SILLON_1` | Variant ID — Sillón 1 Cuerpo |
| `VARIANT_ID_SILLON_3` | Variant ID — Sillón 3 Cuerpos |
| `VARIANT_ID_MESA` | Variant ID — Mesa Ratona |
| `VARIANT_ID_JUEGO` | Variant ID — Juego Living Exterior |

Opcional: `SHOPIFY_API_VERSION` (default `2025-04`).

## Permisos de la app en Shopify

- `read_inventory`
- `write_inventory`
- `read_products`

## Webhook `orders/paid` — qué dispara la sync

Cualquier orden pagada ejecuta el mismo flujo: **no se filtra por productos en la orden**.

- Venta del Juego → recalcula
- Venta de un Sillón 1 suelto → recalcula (lee stock actual de los 3 componentes y actualiza el Juego)
- Venta de cualquier otro producto → también recalcula

El body del webhook solo se usa para verificar HMAC; el inventario se lee siempre en vivo vía GraphQL.

## Flujo (GraphQL)

1. `POST /webhooks/orders-paid` → validar `X-Shopify-Hmac-Sha256`
2. **Query** `nodes` (ProductVariant) → `inventoryItem.id` de las 4 variantes
3. **Query** `inventoryLevel` + `quantities(available)` en `LOCATION_ID` para cada ítem
4. Calcular `stockJuego` con `Math.min(...)`
5. **Mutation** `inventorySetQuantities` → fija el disponible absoluto del Juego (sincronización)

No se usa `inventory_levels/set` (REST deprecado).

## Desarrollo local

```bash
cd shopify-inventory-sync
cp .env.example .env
npm install
npm run dev
```

`GET http://localhost:3000/health`

## Webhook en Shopify

1. **Settings → Notifications → Webhooks**
2. Event: **Order payment** (`orders/paid`)
3. URL: `https://TU-PROYECTO.vercel.app/webhooks/orders-paid`
4. Secret → `SHOPIFY_WEBHOOK_SECRET`

## Deploy en Vercel

```bash
cd shopify-inventory-sync
npx vercel
```

Configurar variables en Vercel. Si el repo es monorepo, **Root Directory** = `shopify-inventory-sync`.

## Obtener IDs

- **Variant / Location IDs**: numéricos en Admin URL o GraphQL.
- La app convierte automáticamente a GIDs (`gid://shopify/ProductVariant/...`, etc.).
