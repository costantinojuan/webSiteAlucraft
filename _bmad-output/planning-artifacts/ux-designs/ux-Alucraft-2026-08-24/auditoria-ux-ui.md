---
title: Auditoría UX/UI Alucraft Outdoor
status: proposed
created: 2026-08-24
product: Alucraft Outdoor
mode: fast-path
---

# Auditoría UX/UI — Alucraft Outdoor

Propuesta de evolución. No implementada. Identidad actual conservada.
Fuente viva: código del repo + capturas de `https://alucraft.com.ar/` (desktop 1440 y mobile 390) el 2026-08-24.

**Fuera de alcance (pedido explícito):** React/Next, Shopify/inventario/IDs/precios, URLs, SEO sin causa, borrar páginas.

**Hechos confirmados en el proyecto** vs **a confirmar con Juan** están marcados.

---

## Cómo está armado el sitio (mapa)

Alucraft vende **dos líneas** en la web Outdoor y una tercera aparte:

| Superficie | Qué es | Cómo se compra |
|---|---|---|
| Home `/` | Ecommerce mobiliario: juego living + 4 piezas | Shopify Buy Button → drawer → checkout Mercado Pago |
| `/pergolas/` | Institucional / a medida | WhatsApp o formulario. No hay precio ni carrito de pérgola |
| `/contacto/` | Lead de proyecto | `enviar.php` |
| `/preguntas-frecuentes/` | Ayuda compra/armado | Links a Home, armado, catálogo |
| `/catalogo/` + PDF | Pieza editorial 2026 (la mejor de la marca) | No es tienda |
| `/armado/` | Post-compra / confianza | Guías PNG/PDF; video “próximamente” |
| `/fences/` | Línea ecuestre, no está en el nav Outdoor | Cotización WhatsApp, precios USD de referencia |
| `/gracias.html` | Post-formulario | Página huérfana de marca |

Navbar Outdoor: Mobiliario · Pérgolas · Contacto · carrito. FAQ, catálogo y armado viven en el footer.

---

# A. Diagnóstico general

| Eje | Nota | Por qué |
|---|---|---|
| Diseño visual | **6.5** | Hero y fotos de living son fuertes. El sistema (Roboto 700, gris `#e6e6e6`, botones Shopify `#272727`) se siente plantilla, no catálogo. |
| Claridad | **5.5** | En 3 s se entiende “muebles de exterior”. No se entiende si Alucraft es tienda, fábrica o ambas, ni cuál es *el* producto vs pérgolas. |
| Consistencia | **4.5** | Catálogo (EB Garamond, `#1d2b24`, papel `#f3f1ec`) ≠ Home ≠ Armado (sombras, logo sin “Outdoor”) ≠ Gracias (verde + emoji) ≠ Fences. CSS navbar copiado 5 veces. |
| Percepción premium | **5** | La foto sí. El widget Shopify, el botón gris, el WhatsApp verde y el empty cart “0” no. |
| UX | **6** | Recorrido de compra corto. Falta contexto de ticket alto antes del “Agregar”. Nav mobile apretada. |
| Mobile | **5** | Hero centrado está bien. Subtítulo y copy de FAQ se cortan. 4 productos en columna es largo. Drawer Shopify no es nativo premium. |
| Ecommerce | **6** | Juego destacado + piezas + carrito global: correcto. Modal “Ver Producto” + iframe = look marketplace. |
| Confianza | **5.5** | Armado, FAQ y showroom existen pero están escondidos. Medidas y colores están en el PDF, no en la Home. |
| Conversión | **5** | CTA hay de más (hero, Shopify, WhatsApp, Contacto). Falta un solo camino claro por intención (comprar living vs cotizar pérgola). |

Promedio ponderado hacia **experiencia de marca premium: ~5.5**. El techo ya está en el catálogo y en las fotos; la web no lo usa.

---

# B. Lo que está bien (conservar)

- Foto hero del living junto a la pileta (`juegoSillon.webp`) y la banda oscura de armado con `cover.jpg`.
- Idea de Home: **un producto hero (juego)** y **piezas sueltas debajo**. Es el modelo correcto para una colección combinable.
- Carrito en el navbar (no flotante lateral). Icono + badge: dirección correcta.
- FAQ en `details/summary`, copy claro, diferencia muebles vs pérgolas.
- Formulario de contacto corto, honeypot, promesa de 24 hs.
- Footer negro con Productos / Ayuda / Contacto.
- Línea Fences **fuera** del nav Outdoor (no mezclar ecuestre con living).
- Stack HTML/CSS/JS/PHP y Shopify Buy Button: no tocar la lógica.
- Paleta base blanco / negro / aluminio y el verde bosque `#1d2b24` del `brandSub` “Outdoor”.
- Claim confirmado: aluminio, encastrable, Allen, apto intemperie, Mercado Pago, showroom Quilmes.

---

# C. Problemas

### P0 — serio

1. **Home es una vitrina Shopify, no una marca.** Debajo del hero aparecen al toque el Buy Button a ancho completo y cuatro iframes. Para un living de ticket alto eso parece catálogo Mercado Libre, no arquitectura outdoor.
2. **Dos negocios sin marco.** Mobiliario = comprar ya. Pérgolas = cotizar. El nav los pone al mismo nivel. El usuario de Instagram no sabe qué botón es el suyo.
3. **Mobile: overflow.** `body { overflow-x: hidden }` a 680px + logo + “OUTDOOR” + carrito + hamburguesa recorta. En captura 390px el subtítulo del hero se corta (“Se arma en casa, e…”). Lo mismo en el lead de FAQ.
4. **Contrato de envío contradictorio.** Carrito: “Envio Gratis a TODO el país”. FAQ: “El costo y el plazo se confirman en el checkout”. En ticket alto, eso rompe confianza. **A confirmar cuál es la verdad comercial.**
5. **`gracias.html` y links muertos.** Post-contacto es una caja verde con emoji. Facebook y YouTube apuntan a `#`.

### P1 — alto impacto

6. La información que sí existe (medidas, colores, encastre, “incluye 1×3 cuerpos + 2×1 cuerpo + mesa”) está en el **catálogo**, no junto al producto que se compra.
7. Tipografía: Roboto 700 en H1 de 56px. El catálogo ya eligió una voz editorial (EB Garamond + Source Sans 3). La web parece otra empresa.
8. CTA Contacto del nav siempre es pastilla gris: parece deshabilitado y no indica página activa.
9. Botones Shopify `#272727` 18px radius 10 vs hero `#e6e6e6` radius 8 vs Armado negro radius 6: tres sistemas.
10. Badge del carrito muestra **0**. Ruido permanente.
11. WhatsApp verde 52px fijo pelea con “marca arquitectónica” y tapará CTAs en mobile.
12. Pérgolas: hero sin CTA; portfolio etiquetado M1–F3 (interno, no humano); “¿Por qué elegirnos?” genérico.
13. Navbar de Armado **sin** “Outdoor”; páginas de guía **sin** nav del sitio (solo “volver”).
14. Productos card: `options: false` + “Ver Producto” abre modal Shopify. Un paso extra y un look de app.

### P2 — recomendable

15. Parallax 72vh (`paralax.webp`) sin copy: foto cara que no cuenta nada.
16. No hay franja de hechos (aluminio / envío / armado / showroom) antes de comprar.
17. FAQ, catálogo y armado no están en el nav: el comprador inseguro no los encuentra.
18. Falta estado hover/focus consistente; varios `:focus { outline: none }` en el toggle.
19. Alt débiles en pérgolas (M1, M2). Logo de armado `alt=""`.
20. Meta de pérgolas: “Fabricamos tu perfil” / 20 años — no aparece en la UI. **A confirmar** si se puede decir.

### P3 — pulido

21. `font-weight: 100` en el subtítulo de pérgolas Home (`pergolasCompare .sub`).
22. Título “Pérgolas de Aluminio” a 18px opacity 0.6 vs subtítulo 36px: jerarquía invertida.
23. Video de armado “próximamente”.
24. `background-attachment: fixed` (ya desactivado en mobile): layout costoso en desktop.
25. Duplicación de `style.css` en pagina2–5 y root.

---

# D. Home ideal

Orden propuesto **con contenido que ya existe** (no inventar bloques vacíos):

```
Hero (foto living + promesa de marca)
↓
Franja de 3 hechos (del catálogo: Apto intemperie · Encastrable · Combinable)
↓
Juego de living (Shopify full, envuelto: qué incluye + medidas del PDF)
↓
Piezas sueltas (las 4 cards, mismo wrap)
↓
Banda armado (la que ya está: caja + Allen + CTAs instructivos/catálogo)
↓
Terminaciones (assets actuales: contexto-arena.jpg + contexto-negro.jpg + chips de color)
↓
Pérgolas (compare fija/móvil, explícito “a medida, se cotiza”)
↓
Cierre (showroom Quilmes + FAQ + un CTA: WhatsApp o Contacto, no los dos compitiendo)
```

El separador parallax o se convierte en esa franja de terminaciones o se elimina del flujo (la foto puede reusarse adentro).

---

# E. Sistema visual recomendado (evolución, no otra marca)

Anclarse al **catálogo 2026**, que ya es la identidad más premium.

### Color

| Rol | Token | Uso |
|---|---|---|
| Ink | `#161616` | Texto |
| Accent / bosque | `#1d2b24` | Marca “Outdoor”, links, foco. Ya está en `brandSub` |
| Paper | `#ffffff` | Superficie |
| Soft | `#f3f1ec` | Fondos de sección (del catálogo) |
| Line | `#e6e3dc` | Bordes |
| Muted | `#6b6b6b` | Secondary text |
| Inverse | `#111111` | Footer, CTA primario sólido |
| **No primario** | Shopify `#272727`, pastilla `#e6e6e6`, WhatsApp verde como marca |

Mantener monocromo + foto. El verde bosque es el único acento (aluminio / jardín), no un verde lima de botón.

Hover CTA sólido: `#111` → `#1d2b24`. Hover ghost: borde ink, fondo paper.

### Tipo

- **Display (H1, claims):** EB Garamond 400 — ya cargada en el catálogo. Una sola familia extra.
- **UI / nav / botones / cuerpo:** Source Sans 3 400/600. Hoy el nav ya la usa.
- **Retirar Roboto** de la marca (dejarla solo si Shopify la fuerza en el iframe).

Escala (desktop → mobile):

| | Desktop | Mobile |
|---|---|---|
| Display | 56 / 1.05 / 400 | 36 |
| H2 | 32 / 1.15 / 400 | 26 |
| H3 | 22 / 1.2 / 500 | 18 |
| Body | 16 / 1.55 / 400 | 15 |
| Small / nav | 13 / 0.12em uppercase | 12 |
| Button | 14 / 600 / 14px 22px | 14 / min height 44px |

### Espacio

- Contenido: **max 1120px** (hoy 1100–1200, irregular).
- Sección: **80–96px** vertical desktop, **48–64px** mobile (hoy mezcla 20, 60, 80).
- Grid productos: 4 → 2 → 1 (ya existe); gap 28px está bien.
- Hero: 85vh max 820px (90vh actual es un poco teatro).

### Forma

- Radius **4px** en fotos/cards (catálogo) y **6px** en botones. Evitar 10–12 y pastillas 20px en CTAs.
- Chips/tags sí pueden ser 20px (colección, “Destacado”).
- Sombras: ninguna en cards de producto. Armado hoy tiene `box-shadow` de SaaS: sacar.
- Imágenes: `object-fit: cover`, ratio 4:5 en cards, 16:9 o full-bleed en lifestyle.

### Botones (2 variantes)

1. **Primary:** fondo `#111`, texto blanco, radius 6.
2. **Ghost:** borde `#161616`, fondo transparente.
Nunca gris relleno `#e6e6e6` como primario (parece disabled).

### Cards producto

Marco del sitio (nombre, medida, “incluye”) + el nodo Shopify adentro. El iframe deja de ser la card.

---

# F. Cambios concretos

### F1. Hero Home

**ACTUAL:** Label “Colección 2026” → H1 “Mobiliario Exterior” → “Diseños de aluminio…” → “Ver colección”.  
**PROPUESTO:** Label Alucraft Outdoor → Display “Living de exterior en aluminio” (voz del catálogo) → una línea de diferencial encastrable → CTA “Ver el juego” (anchor) + ghost “Cotizar pérgola”.  
**POR QUÉ:** El H1 actual es categoría de marketplace. El catálogo ya tiene el naming correcto.

### F2. Bloque de hechos

**ACTUAL:** No existe; se salta a Shopify.  
**PROPUESTO:** 3 columnas con copy ya escrito en `catalogo/mobiliario.html` (Apto intemperie, Encastrable, Combinable). Sin iconos genéricos.  
**POR QUÉ:** Ticket alto necesita razón antes del precio.

### F3. Wrap del juego Shopify

**ACTUAL:** `#product-component-…` a pelo bajo “Destacado”.  
**PROPUESTO:** Columna copy (incluye 1 sofá + 2 sillones + mesa; medidas 200/80/75 etc. del PDF) + el widget a la derecha. IDs Shopify **iguales**.  
**POR QUÉ:** Comprar fácil, sentir marca.

### F4. Piezas

**ACTUAL:** 4 Buy Buttons “Ver Producto” → modal.  
**PROPUESTO:** Foto de catálogo (`sillon1.jpg`…) + nombre + medida + el botón Shopify debajo, o el modal pero con título/medida del sitio afuera.  
**POR QUÉ:** El modal de Shopify se queda; el contexto es nuestro.

### F5. Navbar

**ACTUAL:** 3 links; Contacto gris; Armado distinto.  
**PROPUESTO:** Misma marca en todas las páginas Outdoor. Contacto = link como los otros; estado activo = borde inferior `#1d2b24`. Carrito: ocultar badge si 0. Mobile: “Outdoor” más chico o solo logo; hamburguesa y carrito siempre visibles.  
**POR QUÉ:** 3 ítems está bien (no sumar 7). Sí hay que unificar.

Nav: **no** meter FAQ/Catálogo/Armado en desktop (se satura). En mobile, al final del drawer: Armado, FAQ.

### F6. Carrito (solo UI, misma lógica)

**ACTUAL:** Drawer SDK, botón Pagar `#272727` r10, notice envío gratis, badge 0.  
**PROPUESTO:** Estilos del drawer alineados al sistema (radius 6, ink, Source Sans si el SDK deja). Badge `display` solo con qty > 0. Notice de envío **unificado con FAQ** (ver confirmación).  
**POR QUÉ:** El drawer va a seguir siendo Shopify; se puede dejar de parecer un plugin.

### F7. Contacto

**ACTUAL:** “Formulario de Contacto” + Enviar gris.  
**PROPUESTO:** Título “Contanos el proyecto”. Primary negro. Al lado, datos ya del footer (mail, tel, dirección) para no depender solo del form.  
**POR QUÉ:** La página hoy es un card flotando, sin contexto de marca.

### F8. Pérgolas

**ACTUAL:** Hero phrase-only; M1–F3; why-cards genéricas.  
**PROPUESTO:** Hero + CTA “Pedir cotización”. Renombrar obras a algo humano o “Obra en [lugar]” **si hay dato**; si no, “Pérgola móvil” / “Pérgola fija”. Why: usar claims reales (aluminio, a medida, instalación) — **sin** “+20 años” hasta confirmar.  
**POR QUÉ:** Esta página no vende; debería cotizar.

### F9. Armado / Gracias

**ACTUAL:** Cards con sombra; guías sin chrome del sitio; gracias verde.  
**PROPUESTO:** Mismo nav/footer Outdoor. Cards planas. Gracias con nav + “Volver” + WhatsApp como el resto.  
**POR QUÉ:** Post-compra es parte de la marca.

### F10. WhatsApp

**ACTUAL:** PNG verde fijo.  
**PROPUESTO:** Botón compacto ink o el verde **más chico** y más abajo para no tapar. En desktop, considerar solo footer + “Contacto”.  
**POR QUÉ:** Instagram necesita WhatsApp; el verde no puede ser el color de marca.

---

# G. Quick wins (mayor efecto / menor riesgo)

1. **Tipografía + botones globales:** Source Sans 3 + EB Garamond en H1; primary negro; matar el gris `#e6e6e6` como CTA. Sin tocar Shopify IDs.
2. **Hero copy** (F1) — un HTML.
3. **Franja 3 hechos** (F2) — HTML/CSS, copy ya escrito.
4. **Badge carrito oculto en 0** + unificar nav Armado (logo + Outdoor).
5. **Quitar Facebook/YouTube `#`**; arreglar wrap mobile del hero/FAQ; `gracias.html` al sistema.

Ninguno cambia checkout, productos ni URLs.

---

# H. Cambios grandes (HTML/CSS de estructura)

- Wrap editorial alrededor de los 5 nodos Shopify (F3–F4).
- Bloque terminaciones con fotos de catálogo en Home.
- Reordenar secciones Home (D).
- Pérgolas: hero CTA + retitular portfolio.
- Contacto en dos columnas (form + datos).
- Unificar CSS (hoy 5 copias de navbar): un `site.css` compartido. **No es migración de framework.**
- Drawer mobile: links de ayuda.
- (Opcional, no etapa 1) restyle profundo de opciones/botones *dentro* de `shopify-products.js` `styles:` — sigue siendo el mismo SDK.

No entra: PDP propias, headless Shopify, sacar Buy Button.

---

# I. Plan de implementación

**Etapa 1 — ajustes globales**  
Tokens color/tipo/espacio/botón. Nav unificada + badge 0. Footer social. Overflow mobile. Gracias. Sin reordenar Home.

**Etapa 2 — Home**  
Copy hero. Franja hechos. Reorder. Wrap del juego. Terminaciones con assets actuales. Parallax: reubicar o sacar del ritmo.

**Etapa 3 — productos/ecommerce**  
Medidas y “incluye” junto a widgets. Cards con foto de catálogo. Ajustes de `styles` del Buy Button (no IDs). Copy de envío alineado a lo que confirmes.

**Etapa 4 — secundarias**  
Pérgolas (CTA, nombres). Contacto dos columnas. FAQ wrap + link visible. Armado plano + nav. Guías con header mínimo.

**Etapa 5 — mobile y pulido**  
Drawer, tamaños 44px, WhatsApp vs CTA, contraste, alt, focus-visible, revisar Instagram (390). No optimizar peso de imágenes salvo lo que ya esté.

---

# Imágenes: con lo de ahora vs a producir

**Se puede hacer ya**

- Hero, `cover.jpg`, `juego-hero.jpg`, `contexto-arena.jpg`, `contexto-negro.jpg`, `detalle-logo.jpg`, packshots `sillon1/3`, `mesa`, `reposera`, `back.jpg`.
- Pérgolas: f1–f3, m1–m4, `multimedia/1.webp`, `IMG_3704.webp`.

**Falta producir (no inventar en la web)**

- Persona a escala (el living se ve chico/grande).
- Detalle de encastre / Allen / perfil de aluminio.
- Misma pieza bajo sol fuerte y bajo lluvia/rocío.
- Pérgola con nombre de obra y lugar.
- Packshot de las 4 piezas en **fondo idéntico** (hoy el centro de armado está más limpio que la Home).
- Video de armado (el slot ya existe).

---

# Conversión (sin volverse tienda agresiva)

Usar solo lo confirmado: aluminio, encastre, Allen, apto exterior, colores FAQ, Mercado Pago, showroom, catálogo, armado, WhatsApp.

**A confirmar antes de escribirlo en la UI**

- ¿Envío es gratis a todo el país o se cotiza?
- ¿Plazo de entrega / fabricación?
- ¿Garantía / cambios / devoluciones?
- ¿“Más de 20 años” y “fabricamos tu perfil” son claims de Outdoor?
- ¿Gris claro de tapizado existe? (FAQ sí, catálogo lista 3).
- ¿Facebook/YouTube reales o se ocultan?
- ¿WhatsApp fijo obligatorio en desktop?

---

# Accesibilidad y performance (solo diagnóstico)

- Contraste ink/paper OK; botones grises y texto `#646464` / opacity 0.6, no.
- Hit area carrito 44px bien; Contacto desktop OK; FAQ summary sin chevron claro en algunos renders.
- Focus: hay `outline: none` en toggle; hay `:focus-visible` en el mismo bloque — unificar.
- Semántica: nav OK; pérgolas cards `onclick` en `div` (teclado mal).
- Hero 90vh + Buy Button SDK + 5 productos + Google Fonts duplicadas (página + Shopify `googleFonts: Roboto`) = LCP lento y CLS cuando montan los iframes.
- Parallax fixed: coste de paint.

---

# Lo que no se toca

URLs, IDs Shopify, precios, inventario, webhooks, Fences como producto Outdoor, stack, no borrar páginas.
