# Shopify Inventory Sync — Alucraft

Mini app Node.js + Express para:

- Recalcular inventario de **productos terminados** desde componentes (BOM)
- Panel admin privado con inventario y recálculo manual
- Alertas opcionales por WhatsApp cuando el stock está bajo

Usa **Shopify Admin GraphQL API**.

## Modo de sincronización

Por defecto (`INVENTORY_SYNC_MODE=components`):

1. Lee stock de **productos componente** (estructuras + almohadones + mesa + cajas + manuales)
2. Calcula cuántos sillones, reposeras y mesas se pueden fabricar (`min` de piezas)
3. Actualiza stock de productos **terminados** en Shopify
4. Calcula el Juego Living: `min(floor(sillon1/2), sillon3, mesa)`

Modo legacy (`INVENTORY_SYNC_MODE=legacy`): solo recalcula Juego Living leyendo stock de sillones/mesa terminados (comportamiento anterior).

### Componentes esperados

Creá productos en **borrador** con variantes por color (estructuras/almohadones) o una sola variante (cajas/manuales). SKUs sugeridos (ver `npm run list-ids`):

- Estructuras: `EST-S1-MR`, `EST-S3-NM`, etc.
- Almohadones: `ALM-B1-658010-BE`, `ALM-R3-924412-GO`, etc.
- Mesa componente (draft): `MES-RAT-MR`, `MES-RAT-NM`
- **Cajas** (sin color): `CAJA-S1`, `CAJA-S3`, `CAJA-MES`, `CAJA-REP`
- **Manuales físicos** (sin color): `MAN-S1`, `MAN-S3`, `MAN-MES`, `MAN-REP`

Productos packaging sugeridos en Shopify (borrador, 1 variante, asignar SKU):

| Título en Shopify | SKU |
|-------------------|-----|
| Caja Sillón 1 Cuerpo | `CAJA-S1` |
| Caja Sillón 3 Cuerpos | `CAJA-S3` |
| Caja Mesa Ratona | `CAJA-MES` |
| Caja Reposera | `CAJA-REP` |
| Manual físico Sillón 1 Cuerpo | `MAN-S1` |
| Manual físico Sillón 3 Cuerpos | `MAN-S3` |
| Manual físico Mesa Ratona | `MAN-MES` |
| Manual físico Reposera | `MAN-REP` |

El **Juego** no tiene caja propia: al vender 1 juego se descuentan **2× caja S1 + 1× S3 + 1× mesa** (y los manuales igual).

Variantes terminadas: título `"Marrón / Beige"` (estructura / tela).

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

Opcional: `PRODUCT_ID_REPOSERA`, `PRODUCT_ID_MESA_COMPONENT`, `INVENTORY_SYNC_MODE` (`components`|`legacy`), `LOCATION_ID`, `SHOPIFY_API_VERSION` (default `2025-04`).

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
- `read_orders`
- `write_orders`

(No requiere `read_orders`: los pedidos se ven en Shopify Admin desde un link en el panel.)

## Rutas

| Ruta | Descripción |
|------|-------------|
| `GET /admin/login` | Login privado |
| `GET /admin` | Dashboard (requiere sesión) |
| `POST /admin/api/sync` | Recalcular stock de juegos |
| `POST /webhooks/orders-paid` | Webhook Shopify — venta pagada (HMAC) |
| `POST /webhooks/refunds-create` | Webhook Shopify — cancelación/reembolso con restock (HMAC) |
| `GET /health` | Health check |

## Webhook `orders/paid`

1. Shopify envía la orden pagada (con `line_items`)
2. Se valida `X-Shopify-Hmac-Sha256`
3. **Se descuentan componentes** según el BOM (Juego, Sillón 1/3, Mesa, Reposera)
4. Se recalculan productos terminados en Shopify
5. Opcionalmente alertas WhatsApp si hay stock bajo

Pedidos duplicados (reintentos de Shopify) se ignoran: tag en la orden + id de webhook.

## Webhook `refunds/create`

Cuando cancelás o reembolsás un pedido **con restock** (devolver al inventario), Shopify restockea los productos terminados pero no los componentes. Este webhook lo corrige:

1. Shopify envía el reembolso (con `refund_line_items` y `restock_type`)
2. Solo procesa ítems con restock (`cancel`, `return`, `legacy_restock` — no `no_restock`)
3. Solo si el pedido tiene tag `alucraft-inventory-synced` (fue descontado por la app)
4. **Devuelve componentes** según el mismo BOM de la venta
5. Recalcula productos terminados en Shopify

Reembolsos parciales devuelven solo la cantidad reembolsada con restock.

La app necesita scopes **`write_orders`** (tag `alucraft-inventory-synced`) y **`read_orders`** (leer tags al cancelar/reembolsar).

**Importante:** desactivá el Flow viejo que descontaba componentes al vender el Juego — si no, se descuenta dos veces.

### Probar deducciones sin Shopify

```bash
node scripts/test-order-deduct.js
node scripts/test-refund-restock.js
```

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
- Webhook ventas: `https://TU-PROYECTO.vercel.app/webhooks/orders-paid`
- Webhook reembolsos: `https://TU-PROYECTO.vercel.app/webhooks/refunds-create`

## Configurar webhooks en Shopify

1. **Settings → Notifications → Webhooks**
2. Agregar **Order payment** (`orders/paid`):
   - URL: `https://TU-PROYECTO.vercel.app/webhooks/orders-paid`
3. Agregar **Refund create** (`refunds/create`):
   - URL: `https://TU-PROYECTO.vercel.app/webhooks/refunds-create`
4. Mismo **Secret** en ambos → `SHOPIFY_WEBHOOK_SECRET`

## Panel admin

Tras configurar `ADMIN_USERNAME`, `ADMIN_PASSWORD` y `SESSION_SECRET`:

1. Entrá a `/admin`
2. Verás tarjetas de stock por producto y variantes
3. Botón **Recalcular stock de juegos**
4. Link **Pedidos en Shopify** (abre pedidos pendientes en Shopify Admin)

El token de Shopify **nunca** se expone al frontend; todas las llamadas van por el backend.

## Notas

- **Última sincronización**: se guarda en memoria de la instancia (en Vercel puede resetearse en cold start; el stock en pantalla siempre se consulta en vivo).
- **Ventas**: al pagarse un pedido, la app descuenta piezas del depósito (componentes borrador) y recalcula terminados. No hace falta Shopify Flow para eso.
