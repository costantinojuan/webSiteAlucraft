# Lógica de inventario

## Modo

`INVENTORY_SYNC_MODE` (default **components**):

- **components:** stock de vitrina = unidades **fabricables** según BOM pintado + almohadones + cajas, por variante.
- **legacy:** solo formula el juego desde stock de S1/S3/mesa terminados.

Entrada: `lib/inventorySync.js` → `syncAllStock()` o `syncJuegoLivingStock()`.

## Componentes

Doce piezas de estructura en `lib/bom/pieces.js` (productos Shopify unpublished, título `"Pieza …"`). Tests: `npm run test-pieces` (scripts `assert`, no Jest). Recuento total de SKUs de componente: **verificar** contra `scripts/test-pieces.js` (incluye 5 estados × pieza + almohadones + cajas + Allen).

Piezas de estructura (ejemplos, no lista completa):

- S1: `BAS-S1`, `RES-S1`, laterales `LAT-SIL-REC` / `LAT-SIL-INC`
- S3: `BAS-S3`, `RES-S3`, mismos laterales de sillón
- Mesa: `LAT-MES`, `TAB-MES`
- Reposera: `BAS-REP`, `LAT-REP`, `ACC-REP`, `RES-REP`

Sufijos de color: Natural (sin pintar), `-NM`, `-AR`, WIP `-PINT-NM` / `-PINT-AR`.

Almohadones y cajas son líneas extra de la receta (`recipes.js`).

## Cálculo fabricable

`calculateFabricable(stockBySku, recipe)`: mínimo de `floor(stock_sku / qty_receta)` entre líneas.

Juego: receta fusionada 2×S1 + S3 + mesa (`getJuegoSaleRecipe`). Laterales y otras piezas compartidas se suman en `mergeRecipeLines` antes del mínimo. El README de la app todavía muestra la fórmula legacy `min(floor(S1/2), S3, mesa)` como si fuera el default; en modo `components` el número que se escribe en vitrina es el fabricable BOM, no esa fórmula.

## Variantes de tela vs estructura compartida

`calculateWithSharedStructure` (S1, S3, reposera al Recalcular) calcula el fabricable de **cada variante de tela por separado** (`min` de su receta completa). El comentario en código admite que **puede sobre-contar**: dos telas pueden mostrar stock contra las mismas piezas pintadas; S1 y S3 comparten laterales.

`allocateSharedStructurePool` (reparto round-robin entre telas) **existe pero no se llama** en ningún otro módulo (código muerto respecto del write path).

Eso significa que Recalcular puede dejar en vitrina una suma de variantes mayor que las piezas físicas. El juego, al usar receta unida, no hereda ese sobre-conteo de la misma forma.

## Quién escribe qué

| Acción | Componentes | Vitrina (terminados) |
|---|---|---|
| Cargar depósito | Sí | No |
| Pintura enviar/recibir | Sí (Natural ↔ WIP ↔ pintado) | No |
| Recalcular (admin) | No (solo lee) | **Sí, overwrite** |
| Webhook pedido pagado | Descuenta receta | **Sí, sync** |
| Webhook refund/cancel | Reponer | **Sí, sync** |

El tab **Tienda** del admin muestra un **preview BOM** (`getDashboardBomView`), no una lectura del inventory de productos terminados. El copy dice que es el stock que ve el cliente: eso solo es cierto **después** de un sync. Tras cargar Natural sin Recalcular, el tab puede no coincidir con el Buy Button.

Implicación: después de cargar Natural, Tienda (BOM) puede mostrar fabricable 0 en pintados mientras la vitrina sigue con qty histórica hasta Recalcular o un pedido que dispare sync.

## Alertas (panel Tienda)

Fila `is-low` si `totalFabricable <=` umbral. Mesa default `ALERT_THRESHOLD_MESA=2` (2 disponibles = aviso, no “color Arena”). WhatsApp opcional con cooldown ~6h (env).

## Carreras e idempotencia

`handleOrderPaid` → `claimOrderForProcessing`:

1. Si la orden ya tiene tag `alucraft-inventory-synced`, salta.
2. Dedup en memoria: id de webhook + par shop/order (no sobrevive cold start).
3. **Escribe el tag en Shopify antes de descontar componentes.** Si el proceso muere entre tag y `applyComponentDeductions`, el siguiente webhook **salta** (`order_tagged`) y **no descuenta**. Si `tagsAdd` falla (p. ej. falta `write_orders`), avisa en log y sigue; entonces dos isolates pueden descontar dos veces.
4. Recién después descuenta BOM y corre `runInventorySync` (overwrite de **todos** los terminados, no solo el vendido).

Recalcular vs carga concurrente: último write gana en Shopify inventory.

## Scripts one-shot

`shopify-inventory-sync/scripts/` incluye utilidades (p. ej. mover stock Recto → Inclinado). Algunos pueden estar **untracked** y ya haberse ejecutado contra la tienda. No re-ejecutar sin leer el script y el estado actual de Shopify.

## UNKNOWN

- Stock real de producción vs lo que asume el código (solo se ve en Shopify Admin / panel).
- Si las 2 reposeras de una carga Natural reciente incluyen `RES-REP` (la pieza se agregó después de esa carga).
