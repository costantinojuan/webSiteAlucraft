---
title: 'Unificar el carrito Shopify de la Home con el resto del sitio'
type: 'bugfix'
created: '2026-08-23'
status: 'done'
review_loop_iteration: 0
baseline_commit: '607cc118429d1f62b55cdd7488824ec737c1b110'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La Home monta el carrito Shopify embebido en cada `createComponent("product")` (`shopify-products.js`). El resto del sitio monta un carrito standalone con `createComponent('cart')` (`shopify-global.js`). No son dos checkouts distintos (el SDK persiste el mismo checkoutId en localStorage), pero sí dos caminos de UI: dos `buildClient` + dos `UI.onReady`, copy distinto (`Pagar` vs `Checkout`) y riesgo de toggles duplicados si ambos scripts conviven.

**Approach:** Un solo `createComponent('cart')` en `shopify-global.js` para todo el sitio, incluida la Home. `shopify-products.js` sigue montando los 5 productos, pero sin `cart`/`toggle` y sobre el mismo `ui` que el carrito global.

## Boundaries & Constraints

**Always:**
- Los 5 productos de Home, sus botones (`Agregar al carrito` / `Ver Producto` + modal) y los nodeIds actuales siguen funcionando.
- Un único componente carrito visible (un toggle, un drawer).
- El checkout persiste al navegar Home ↔ Pérgolas ↔ Contacto ↔ FAQ ↔ Armado y al recargar.
- Copy/estilos del carrito de Home se vuelven el carrito del sitio: título `Carrito de compras`, `Subtotal`, `Tu carrito está vacío`, notice `Envio Gratis a TODO el país`, botón `Pagar`, radius `10px`, count `18px`.
- `shopify-hide-unavailable.js` sigue parcheando variantes en Home.
- SDK Buy Button se inyecta una sola vez.

**Ask First:**
- Cualquier cambio de IDs de producto, `moneyFormat`, domain o storefront token.
- Si al compartir `ui` el add-to-cart de Home no alimenta el cart global (el SDK no reusa la instancia).

**Never:**
- Tocar `enviar.php`, `config.mail.php`, webhooks, `shopify-inventory-sync/`, precios o IDs de Shopify.
- Eliminar `shopify-products.js` o dejar de montar los 5 productos.
- Crear un tercer sistema de carrito o persistencia custom (cookies, localStorage propio).
- Refactors de CSS/nav/otras páginas no necesarios para este carrito.
- Cargar ambos scripts en Home sin quitar `cart`/`toggle` de `productOptions()`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Home → otra página | Add en `/`, navegar a `/pergolas/` | Mismo ítem, mismas cantidades | N/A |
| Ida y vuelta | Volver a `/` y abrir carrito | Sigue el mismo carrito | N/A |
| Segundo producto | Add otro en Home, navegar de nuevo | Ambos ítems presentes | N/A |
| Recarga | Reload con ítems | Checkout restaurado por el SDK | Si el checkout expiró, carrito vacío (comportamiento SDK) |
| Qty / remove / checkout | +/- , eliminar, Pagar | Subtotal actualiza; checkout abre Shopify | N/A |
| Sin duplicados | Home con ambos scripts | Un solo toggle/drawer | N/A |
| Mobile | Viewport chico | Toggle, drawer, botones y modal de cards siguen usables | N/A |

</frozen-after-approval>

## Code Map

- `index.html` L36 `shopify-hide-unavailable.js`; L85–98 nodeIds `product-component-*`; L183 solo `shopify-products.js` (hoy no carga `shopify-global.js`).
- `shopify-products.js` — `PRODUCTS` L5–11 (no tocar ids/nodeIds/layouts); `productOptions()` L28–196 incluye `cart` L161–183 y `toggle` L184–195 (quitar); `mountProducts()` L199–219 hace `buildClient` + `createComponent("product")` ×N; `loadScript()` L222–234.
- `shopify-global.js` — único `createComponent('cart')` L29–75; copy `Checkout` L70 y radius `36px` L63 vs Home (`Pagar`, notice, `10px`); se usa en `pagina2/pergolas.html` L278, `pagina4/contacto.html` L139, `pagina5/preguntas.html` L157, `armado/index.html` L321, `gracias.html` L53.
- Persistencia SDK (no hay código propio): localStorage `{token}.{domain}.checkoutId` con domain `v4apub-im.myshopify.com`.
- `shopify-hide-unavailable.js` L125–145 parchea `UI.onReady` → `createComponent("product")`; debe seguir aplicando si el `ui` nace en global.
- Read-only: `enviar.php`, `shopify-inventory-sync/**`, IDs en `PRODUCTS[]`, precios (vienen de Shopify).

## Tasks & Acceptance

**Execution:**
- [x] `shopify-global.js` -- Convertirlo en la única inicialización de cliente+carrito: un `createComponent('cart')`, copy/estilos de Home, guard contra doble inyección del SDK, y señal de `ui` listo para que los productos se monten sobre esa misma instancia -- Un carrito coherente y un solo `ui`.
- [x] `shopify-products.js` -- Quitar bloques `cart` y `toggle` de `productOptions()`; dejar de crear un segundo carrito; montar los 5 productos sobre el `ui` de global; no inyectar el SDK si ya está (o está cargando) -- Conserva embeds de Home sin UI de carrito paralela.
- [x] `index.html` -- Cargar `/shopify-global.js` antes de `/shopify-products.js`; no tocar nodeIds ni hide-unavailable -- Home entra al mismo camino que el resto del sitio.

**Acceptance Criteria:**
- Given un ítem agregado en `/`, when el usuario navega a `/pergolas/` (u otra página con carrito) y abre el carrito, then el mismo ítem sigue ahí.
- Given ese carrito, when vuelve a `/` y agrega otro producto, then ambos persisten al navegar y al recargar.
- Given Home cargada, when se inspecciona el DOM, then hay un solo toggle/drawer y una sola etiqueta `buy-button-storefront.min.js`.
- Given los 5 embeds de Home, when se usan botones full/card/modal, then siguen agregando al mismo carrito global y hide-unavailable sigue ocultando combinaciones inválidas.

## Spec Change Log

## Design Notes

Dos `ShopifyBuy.buildClient` + dos `UI.onReady` pueden crear dos instancias `ui`. El add-to-cart de producto solo alimenta el cart si ambos viven en el **mismo** `ui`. Por eso global crea el cart y expone ese `ui`; products solo hace `createComponent("product")` sobre él.

Handshake mínimo (ilustrativo, no prescriptivo de nombres):

```js
// global, tras createComponent('cart')
window.AlucraftShopifyUI = ui;
document.dispatchEvent(new Event("alucraft:shopify-ready"));
```

No persistir checkout a mano: el SDK ya usa localStorage.

## Verification

**Manual checks (if no CLI):**
- Grep: un solo `createComponent('cart')` en el repo (en `shopify-global.js`); `productOptions()` sin claves `cart`/`toggle`; `index.html` carga global antes de products.
- En el navegador (desktop y mobile): flujo de la matriz I/O; consola sin errores de SDK duplicado; un toggle; checkout `Pagar` abre Shopify.

## Suggested Review Order

**Punto de entrada**

- Home ahora carga el carrito global antes de montar productos.
  [`index.html:183`](../../index.html#L183)

**Carrito único**

- Un solo `createComponent('cart')` para todo el sitio.
  [`shopify-global.js:47`](../../shopify-global.js#L47)

- Copy y estilos de Home (`Pagar`, envío gratis, radius 10px).
  [`shopify-global.js:88`](../../shopify-global.js#L88)

**Handshake del mismo `ui`**

- Tras crear el carrito, se expone el `ui` para los productos.
  [`shopify-global.js:8`](../../shopify-global.js#L8)

- Guardas para no iniciar un segundo cliente/carrito.
  [`shopify-global.js:36`](../../shopify-global.js#L36)

**Productos de Home sin carrito propio**

- Los 5 embeds se montan sobre el `ui` global, no sobre un client nuevo.
  [`shopify-products.js:163`](../../shopify-products.js#L163)

- Espera el handshake; un fallo de mount no saltea el resto.
  [`shopify-products.js:186`](../../shopify-products.js#L186)

