---
title: 'Limpieza y optimización de assets de Alucraft'
type: 'chore'
created: '2026-08-24'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'c276ab7ce923780dda8c1abcb346e2017b4fb564'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El repo y el zip de subida pesan de más por fotos de cámara sin usar, assets huérfanos y algunas imágenes live más pesadas de lo necesario. El sitio no debe cambiar de aspecto ni de comportamiento.

**Approach:** Borrar solo archivos con evidencia de cero referencias. Comprimir en el mismo path/formato las fotos live pesadas. No rediseñar, no unificar CSS, no tocar Shopify ni el formulario.

## Boundaries & Constraints

**Always:**
- Antes de borrar: grep en HTML/CSS/JS/PHP/`.htaccess`. Si hay duda, no borrar.
- Optimizar fotos live **in place** (mismo nombre y formato). Calidad visual casi igual (JPEG ~q85, WebP ~q82–85). Logos/PNG de transparencia: solo pngquant/oxipng suave, nunca JPG.
- Mantener URLs públicas, redirects, nav, carrito, productos, checkout, inventario, contacto, SMTP, SEO, analytics, Fences.
- Separar: borrar del repo ≠ quitar BMAD/git del proyecto.

**Ask First:**
- Convertir JPG live a WebP (rompe rutas).
- Borrar un archivo referenciado solo por URL pública sin match interno.
- Tocar `fences/multimedia/hero.jpg` (la CSS lo pide y el archivo no existe; hoy hay fallback gradient).

**Never:**
- Shopify (IDs, cart, checkout, `shopify-*.js`, selectores `.shopify-buy__*`).
- Inventario/BOM/webhooks, `enviar.php`, `config.mail.php`.
- Redesign, merge de CSS de nav, React/Vite.
- Borrar `_bmad/`, `_bmad-output/`, `.agents/`, `.git/`, `shopify-inventory-sync/`, `test-bmad/`, `manualDeArmado/` usado, `alucraft-web.zip` del disco (el usuario lo acaba de generar).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Home | Carga `/` | Hero, productos, nav, carrito, WhatsApp iguales | Si falta un asset live, revertir ese archivo |
| Páginas | Pérgolas / Contacto / FAQ / Armado / Catálogo / Fences | Imágenes y layout iguales | N/A |
| Borrado | JPG de cámara | Cero 404 en el sitio | Restaurar si aparece una ref |
| Formulario | Envío contacto | Sigue `enviar.php` → `gracias.html` | N/A |

</frozen-after-approval>

## Code Map

**Borrar (cero refs en html/css/js/php/htaccess):**
- `fotosSeleccionadas/IMG_*.JPG` + `IMG_*-limpia.jpg` + `juegoIndex.webp` — ~165 MB. Keep: `juegoSillon.webp`, `paralax.webp` (`pagina3/style.css`).
- `fonts/` 4× `.otf` — Google Fonts CDN, sin `@font-face`.
- `/script.js`, `armado/script.js` — ningún `<script>` los carga.
- `Logos/alucraftLogoNegro.png`, `Logos/alucraft-logo-blanco.png`.
- `catalogo/img/`: `intro-living.jpg`, `reposera-pool.jpg`, `juego-patio.jpg`, `juego-shopify.jpg`.
- `multimedia/` huérfanos (keep `1.webp`, `IMG_3704.webp` usados en `pagina3/style.css` L697–701 y `style.css` L383–387): `2–8.webp`, `portada-*.webp`, `asesoramiento/diseno/fabricacion/instalacion/juegoJardin/pergolaFija/sillon1c.webp`, `IMG_3451.webp`, `IMG_3702.webp`, `833AE57E*.webp`, carpeta vacía `fotosMobiliarioExterior/`.
- `error_log`; `.DS_Store` trackeados (gitignore ya los ignora).

**Comprimir in place (referenciados, >~400 KB):**
- `catalogo/img/back.jpg` 2.4 MB, `cover.jpg` 2.1 MB (también `pagina3/style.css`), `juego-hero.jpg`, `contexto-arena.jpg`, `contexto-negro.jpg`, `detalle-logo.jpg`.
- WebP live: `pagina2/multimedia/f1–f3/*.webp` grandes, `multimedia/1.webp`, `multimedia/IMG_3704.webp`.
- PNG diagramas: `manualDeArmado/Manual-*.png` (oxipng/pngquant suave).

**No borrar:** `style.css` (Armado hub), `pagina3/style.css` (Home), CSS duplicado de nav, `pagina4/script.js` en FAQ, `armado/armado.html`, `fences/`, PDF catálogo, WhatsApp `multimedia-items/`.

**Candidatos (no borrar):** bloques CSS legacy en `style.css`; `pagina2/script.js` `updateProcessLine`; `fences/.../hero.jpg` faltante.

**Read-only:** `shopify-*.js`, `enviar.php`, `.htaccess`, `nav.js`, IDs en `PRODUCTS[]`.

## Tasks & Acceptance

**Execution:**
- [x] Borrar la lista SAFE del Code Map (y `git rm` de `.DS_Store` trackeados) -- Recorta ~165 MB sin tocar URLs live.
- [x] Comprimir in place las fotos live del Code Map; no cambiar nombres -- Baja peso con la misma ruta.
- [x] Grep post-cambio: ninguna ref a archivos borrados; Home/Pérgolas/Catálogo/Armado siguen resolviendo imágenes -- Evita 404.

**Acceptance Criteria:**
- Given una página live, when carga, then se ve igual (mismos paths de assets usados).
- Given el repo, when se listan `IMG_*.JPG` en `fotosSeleccionadas/`, then ya no están y `juegoSillon.webp` / `paralax.webp` sí.

## Spec Change Log

## Design Notes

No convertir catálogo JPG→WebP: `mobiliario.html` y `pagina3/style.css` apuntan a `.jpg`. No recortar CSS de nav duplicado. `.DS_Store` es metadata de Finder, no del sitio.

## Verification

**Commands:**
- `git grep -n 'IMG_2729\\|juegoIndex\\|GGX89\\|script.js' -- '*.html' '*.css' '*.js'` -- expected: sin hits a archivos borrados (salvo `pagina2/script.js` etc. vivos)
- Comparar bytes de carpetas `fotosSeleccionadas`, `catalogo/img`, `multimedia` antes/después

**Manual checks:**
- Home, productos, carrito, Pérgolas, Contacto, FAQ, Armado, catálogo, Fences, mobile/desktop, formulario.

## Suggested Review Order

**Qué se conservó**

- El hero de Home sigue apuntando al webp live, no a las JPG de cámara.
  [`style.css:264`](../../pagina3/style.css#L264)

**Fotos live comprimidas**

- `cover.jpg` bajó de 2.1 MB a 256 KB; misma ruta en Home y catálogo.
  [`mobiliario.html:269`](../../catalogo/mobiliario.html#L269)

- `back.jpg` igual: misma URL, JPEG más liviano.
  [`mobiliario.html:472`](../../catalogo/mobiliario.html#L472)

- Galería de Pérgolas reusa los mismos `.webp` (q82 si pesaban menos).
  [`script.js:105`](../../pagina2/script.js#L105)
