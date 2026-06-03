# Shopify Inventory Sync — Alucraft

Mini app Node.js + Express para:

- Recalcular stock del **Juego Living Exterior** desde sus componentes
- Panel admin privado con inventario, pedidos pendientes y recálculo manual
- Alertas opcionales por WhatsApp cuando el stock está bajo

Usa **Shopify Admin GraphQL API**.

## Fórmula del Juego

```js
stockJuego = Math.min(
  Math.floor(stockSillon1 / 2),
  stockSillon3,
  stockMesa
);
```

## Variables de entorno

### Shopify (obligatorias)

| Variable | Descripción |
|----------|-------------|
| `SHOPIFY_STORE_DOMAIN` | `tu-tienda.myshopify.com` |
| `SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET` | App del Dev Dashboard (client credentials) |
| o `SHOPIFY_ADMIN_ACCESS_TOKEN` | Token estático legacy |
| `SHOPIFY_WEBHOOK_SECRET` | Secret del webhook `orders/paid` |
| `PRODUCT_ID_SILLON_1` | Product ID — Sillón 1 Cuerpo |
| `PRODUCT_ID_SILLON_3` | Product ID — Sillón 3 Cuerpos |
| `PRODUCT_ID_MESA` | Product ID — Mesa Ratona |
| `PRODUCT_ID_JUEGO` | Product ID — Juego Living Exterior |

Opcional: `PRODUCT_ID_REPOSERA`, `LOCATION_ID`, `SHOPIFY_API_VERSION` (default `2025-04`).

### Panel admin (obligatorio para `/admin`)

| Variable | Descripción |
|----------|-------------|
| `ADMIN_USERNAME` | Usuario del login |
| `ADMIN_PASSWORD` | Contraseña del login |
| `SESSION_SECRET` | Clave larga para firmar la sesión |

### Alertas de stock (opcional)

| Variable | Default | Descripción |
|----------|---------|-------------|
| `ALERT_THRESHOLD_SILLON_1` | 4 | Alerta si stock ≤ umbral |
| `ALERT_THRESHOLD_SILLON_3` | 2 | |
| `ALERT_THRESHOLD_MESA` | 2 | |
| `ALERT_THRESHOLD_REPOSERA` | 2 | |
| `ALERT_THRESHOLD_JUEGO` | 1 | |

### WhatsApp (opcional)

Si no configurás proveedor, la app **no falla** — solo omite el envío.

**Twilio**

| Variable | Descripción |
|----------|-------------|
| `WHATSAPP_PROVIDER` | `twilio` |
| `WHATSAPP_TO` | Tu número, ej. `+54911...` |
| `TWILIO_ACCOUNT_SID` | |
| `TWILIO_AUTH_TOKEN` | |
| `TWILIO_WHATSAPP_FROM` | Ej. `whatsapp:+14155238886` |

**WhatsApp Cloud API (Meta)**

| Variable | Descripción |
|----------|-------------|
| `WHATSAPP_PROVIDER` | `cloud_api` |
| `WHATSAPP_TO` | Número destino sin `+` o con `+` |
| `WHATSAPP_CLOUD_TOKEN` | Token de acceso |
| `WHATSAPP_CLOUD_PHONE_NUMBER_ID` | Phone number ID |

Las alertas tienen cooldown de 6 horas por variante para no spamear.

## Permisos de la app en Shopify

- `read_inventory`
- `write_inventory`
- `read_products`
- `read_orders` (pedidos pendientes en el dashboard)

## Rutas

| Ruta | Descripción |
|------|-------------|
| `GET /admin/login` | Login privado |
| `GET /admin` | Dashboard (requiere sesión) |
| `POST /admin/api/sync` | Recalcular stock de juegos |
| `POST /webhooks/orders-paid` | Webhook Shopify (HMAC) |
| `GET /health` | Health check |

## Webhook `orders/paid`

1. Shopify envía orden pagada
2. Se valida `X-Shopify-Hmac-Sha256`
3. Se recalcula stock del Juego desde componentes
4. Opcionalmente se envían alertas WhatsApp si hay stock bajo

Cualquier venta pagada dispara el recálculo (no se filtra por productos en la orden).

## Desarrollo local

```bash
cd shopify-inventory-sync
cp .env.example .env
npm install
npm run dev
```

- Dashboard: `http://localhost:3000/admin`
- Health: `http://localhost:3000/health`
- Webhook local: usar ngrok o similar hacia `/webhooks/orders-paid`

## Obtener Product IDs

```bash
npm run list-ids
```

## Deploy en Vercel

```bash
cd shopify-inventory-sync
npx vercel
```

En el proyecto de Vercel:

1. **Root Directory** = `shopify-inventory-sync` (si el repo es monorepo)
2. Agregar todas las variables de entorno
3. Redeploy

URLs de producción:

- Panel: `https://TU-PROYECTO.vercel.app/admin`
- Webhook: `https://TU-PROYECTO.vercel.app/webhooks/orders-paid`

## Configurar webhook en Shopify

1. **Settings → Notifications → Webhooks**
2. Event: **Order payment** (`orders/paid`)
3. URL: `https://TU-PROYECTO.vercel.app/webhooks/orders-paid`
4. Secret → `SHOPIFY_WEBHOOK_SECRET`

## Panel admin

Tras configurar `ADMIN_USERNAME`, `ADMIN_PASSWORD` y `SESSION_SECRET`:

1. Entrá a `/admin`
2. Verás tarjetas de stock por producto y variantes
3. Pedidos pendientes (no preparados / parciales)
4. Botón **Recalcular stock de juegos**

El token de Shopify **nunca** se expone al frontend; todas las llamadas van por el backend.

## Notas

- **Última sincronización**: se guarda en memoria de la instancia (en Vercel puede resetearse en cold start; el stock en pantalla siempre se consulta en vivo).
- **Flow + app**: Flow descuenta componentes al vender el Juego; esta app recalcula el stock del Juego. Son complementarios.
