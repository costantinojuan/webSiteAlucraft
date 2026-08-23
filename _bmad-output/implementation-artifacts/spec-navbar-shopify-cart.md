---
title: 'Mover el acceso al carrito Shopify al navbar'
type: 'feature'
created: '2026-08-23'
status: 'done'
review_loop_iteration: 0
baseline_commit: '1031109964067f4e6991385ed1851f9fc845efb1'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El carrito global de Shopify se abre con el toggle sticky por defecto del Buy Button: un botón flotante a la derecha. No forma parte del navbar de Alucraft.

**Approach:** Reubicar ese mismo toggle del SDK en un slot del navbar Outdoor, a la derecha junto al hamburger. El drawer, el checkout y la persistencia no cambian.

## Boundaries & Constraints

**Always:**
- Un solo `createComponent('cart')` en `shopify-global.js` y el mismo `ui` (`AlucraftShopifyUI`).
- El click del icono del navbar abre ese carrito (no uno nuevo).
- Contador = suma de cantidades (`Sillón×2 + Mesa×1` → `3`). Vacío: `0` u oculto.
- El contador se actualiza solo al agregar, cambiar qty o eliminar.
- En mobile el icono queda fuera de `#navMenu`, visible junto al hamburger.
- Encaja en la estética actual del navbar (alineado, hit area cómoda, sin salto de layout).
- Funciona en las 5 páginas Outdoor que ya cargan `shopify-global.js`.

**Ask First:**
- Si el SDK no acepta `toggles` sobre `createComponent('cart')` y hay que caer a un botón custom + `AlucraftShopifyUI.openCart()`.
- Cambiar domain, token, IDs de producto, o agregar carrito a Fences / `gracias.html`.

**Never:**
- Segundo cart, segundo checkout o persistencia propia.
- Quitar el drawer / panel lateral del carrito.
- Tocar IDs/variantes, inventario, webhooks, `enviar.php`, formulario de contacto, `shopify-inventory-sync/`.
- Refactorizar el header a un partial compartido.
- Tocar `shopify-products.js` (ya no crea cart/toggle).
- Dejar el tab flotante como fallback en Home, Pérgolas, Contacto, FAQ o Armado.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Add en Home | Click Agregar | Contador navbar = unidades | N/A |
| Abrir | Click icono navbar | Abre el drawer existente | N/A |
| Navegar | Ir a otra página Outdoor | Mismo count y mismo carrito | N/A |
| Qty / remove | +/- o eliminar en drawer | Contador navbar actualiza | N/A |
| Recarga | Reload con ítems | Checkout persistido por SDK | Si expiró, vacío (SDK) |
| Vacío | Sin ítems | Count `0` u oculto; sin tab flotante | N/A |
| Mobile | ≤680px | Icono visible fuera del hamburger | N/A |
| gracias | Página sin navbar | El cart puede init; no hay tab flotante | N/A |

</frozen-after-approval>

## Code Map

- `shopify-global.js` L47–99 — único `createComponent('cart')`. `options.toggle` L51–68 solo estiliza; no setea `sticky: false` ni `toggles`, por eso el SDK pega el tab fixed a la derecha. `cart.popup: false` L71 (drawer; no tocar). Guards L5–6 y L36–38. `AlucraftShopifyUI` + `alucraft:shopify-ready` L8–10.
- SDK Buy Button: `toggle.sticky` default `true` = tab flotante. `toggles: [{ node }]` monta el mismo toggle en un nodo. `CartToggle.count` suma `lineItem.quantity`.
- Navbar Outdoor duplicado (insertar `#navCartToggle` entre `#navMenu` y `#hamburger`): `index.html` L40–66, `pagina2/pergolas.html` L39–65, `pagina4/contacto.html` L39–65, `pagina5/preguntas.html` L38–64, `armado/index.html` L189–214.
- CSS nav, sin reglas de cart hoy: `pagina3/style.css` (Home), `pagina2/style.css` (Pérgolas), `pagina4/style.css` (Contacto + FAQ), `style.css` (Armado). `.navBar` 56px flex; hamburger oculto en desktop y visible ≤680px.
- `nav.js` — solo hamburger (`#hamburger`, `#navMenu`). El slot debe quedar fuera de `#navMenu`.
- `shopify-products.js` — solo monta productos sobre `AlucraftShopifyUI`. Read-only.
- `gracias.html` L53 carga global sin navbar. `fences/*` es otro nav, sin Shopify. Read-only: `enviar.php`, `shopify-inventory-sync/**`, `PRODUCTS[]`.

## Tasks & Acceptance

**Execution:**
- [x] `shopify-global.js` -- Montar el toggle existente en `#navCartToggle` con `sticky: false`; si no hay slot, crear el cart sin tab flotante; adaptar el estilo del toggle al navbar blanco; no crear otro cart -- Un solo acceso, mismo drawer.
- [x] `index.html`, `pagina2/pergolas.html`, `pagina4/contacto.html`, `pagina5/preguntas.html`, `armado/index.html` -- Agregar el slot `#navCartToggle` entre el menú y el hamburger -- El botón aparece en todas las páginas Outdoor.
- [x] `pagina3/style.css`, `pagina2/style.css`, `pagina4/style.css`, `style.css` -- Estilos mínimos del slot (alineación, hit area, sin salto de layout, count discreto) -- Encaja en la barra actual.
- [x] Verificar a mano la matriz I/O en desktop y mobile -- Confirmar count, persistencia y que no quedó el tab flotante.

**Acceptance Criteria:**
- Given Home con navbar, when carga la página, then no hay tab flotante a la derecha y el icono está en el navbar.
- Given un producto agregado, when el usuario navega a otra página Outdoor y recarga, then el count del navbar es la suma de unidades y el click abre el mismo drawer.

## Spec Change Log

## Design Notes

El tab flotante no es CSS del sitio: es el default `sticky: true` del toggle del Buy Button. Reubicarlo con `toggles: [{ node: #navCartToggle }]` + `toggle.sticky: false` reusa el mismo componente (click + count). No armar un botón custom salvo que se dispare el Ask First.

Mobile: el slot va fuera de `#navMenu` (hermano del hamburger) para que el carrito quede siempre visible.

## Verification

**Manual checks:**
- Home → add → count navbar; click abre drawer; navegar; count igual; +/- y remove actualizan count; reload persiste; desktop y ≤680px; no toggle flotante; `gracias.html` sin tab flotante; una sola etiqueta `buy-button-storefront.min.js`.

## Suggested Review Order

**Reubicación del toggle**

- El mismo `createComponent('cart')` deja de ser sticky y se monta en el slot.
  [`shopify-global.js:54`](../../shopify-global.js#L54)

- Si hay `#navCartToggle`, reusa ese nodo; si no, no crea tab flotante.
  [`shopify-global.js:119`](../../shopify-global.js#L119)

**Navbar Outdoor**

- Slot a la derecha, fuera del hamburger, en las cinco páginas.
  [`index.html:62`](../../index.html#L62)

- Cache-bust del CSS de Armado, que antes no tenía query.
  [`armado/index.html:9`](../../armado/index.html#L9)

**Estilo en la barra**

- Slot 44×44, badge blanco sobre negro y foco visible.
  [`pagina3/style.css:159`](../../pagina3/style.css#L159)

- En mobile el icono queda junto al hamburger, no dentro del drawer.
  [`pagina3/style.css:914`](../../pagina3/style.css#L914)
