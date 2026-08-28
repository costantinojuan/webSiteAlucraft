# Lógica de negocio (catálogo y venta)

## Productos terminados (vitrina)

Cinco productos Shopify publicados, embebidos **solo en Home** vía Buy Button (`shopify-products.js`). El token y el carrito viven en `shopify-global.js`.

Colores de estructura en recetas: **Natural** (depósito), **Negro Microtexturado (NM)**, **Arena (AR)**. Telas de almohadón en código: Beige, Gris Claro, Gris Oscuro, Tostado (`lib/bom/colors.js`).

Estilo de patas (sillones y juego): **Recto** o **Inclinado**. Laterales de sillón son SKUs distintos (`LAT-SIL-REC` vs `LAT-SIL-INC`). El metal de respaldo es el mismo por producto (`RES-S1`, `RES-S3`). Reposera tiene `RES-REP` (pieza respaldo).

Mesa: laterales `LAT-MES` + tablero `TAB-MES`. Reposera: base, laterales, accesorio, respaldo, almohadón, caja.

## Juego Living Exterior

No se “fabrica” un SKU juego aparte en depósito. La receta de venta (`getJuegoSaleRecipe`) es:

- 2 × receta Sillón 1 cuerpo (misma variante de color/estilo)
- 1 × receta Sillón 3 cuerpos
- 1 × receta Mesa (color de estructura derivado del título del juego)

Stock fabricable del juego = `calculateFabricable` sobre esa receta unida (componentes compartidos no se cuentan dos veces de más: `mergeRecipeLines`).

Modo **legacy** (si `INVENTORY_SYNC_MODE=legacy`): `min(floor(S1/2), S3, mesa)` leyendo stock de **productos terminados**, no del BOM. El default del código es **components**.

## Pintura

No es una venta. Flujo:

1. Natural en depósito (`SKU` sin sufijo de color, o convención Natural en el producto pieza).
2. Enviar a taller → WIP (`*-PINT-NM` / `*-PINT-AR`).
3. Recibir → pintado (`*-NM` / `*-AR`).

El admin de Pintura tiene impresión de códigos, envío y recepción por lote. WIP **no** aparece en el formulario “Cargar depósito”.

**No Recalcular** después de cargar Natural o de un envío a pintura: Recalcular pisa vitrina con fabricable de BOM **pintado** + almohadones y puede dejar en 0 lo que se había ajustado a mano en productos publicados.

## Carga de depósito

Modos: Sumar / Restar / Dejar en. Pestañas: Natural, Negro, Arena, Almohadones, Cajas, Herramientas (llaves Allen). Escribe inventario de componentes vía Admin API. **No** dispara `runInventorySync`.

## Venta (pedido pagado)

Webhook `orders/paid`:

1. Parsea line items de productos terminados.
2. Descuenta receta pintada (BOM) de componentes.
3. Corre `runInventorySync` → **setea** qty de **todos** los productos terminados al fabricable BOM actual (no solo la línea vendida). Si el BOM pintado es 0, la vitrina puede quedar en 0 aunque se hubiera ajustado a mano.

Reembolsos / cancelaciones: restauran componentes (según README y rutas webhook) y vuelven a sincronizar. Detalle exacto de edge cases (reembolso parcial, line items no-BOM) **NEEDS VERIFICATION** contra `lib/` de refunds.

## Contacto

Formulario PHP: nombre, teléfono, email, mensaje. Anti-bot honeypot + tiempo mínimo. Destino SMTP en `config.mail.php`. Éxito → `gracias.html` o query `status` en contacto.

## Envíos y copy comercial

El carrito Buy Button puede mostrar copy de envío (p. ej. “Envío Gratis a TODO el país”). FAQ indica que el envío se confirma en checkout. **Inconsistencia comercial** documentada en KNOWN_ISSUES — no está resuelta en código.

## Cupón CAMI

No hay lógica CAMI en el JS del sitio. Vive en Shopify Discounts. UNKNOWN: automático vs código que hay que tipear en checkout.

## IDs, precios, `contents`, `buttonDestination`

Protegidos por convención del proyecto: no cambiar salvo pedido explícito. Checkout es el de Shopify, no un checkout custom.
