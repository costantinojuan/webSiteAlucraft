# Roadmap (post-discovery)

No es un compromiso de implementación. Agrupa trabajo **después** de que Juan elija. Toda implementación debe: leer `docs/` → impacto → agente BMAD → cambio chico → test → actualizar docs.

**No tocar** sin pedido: IDs públicos, precios, `contents` / `buttonDestination` Buy Button, publicar piezas, Recalcular en producción “por las dudas”.

## Rápidas (horas, bajo riesgo de compra)

- **C1 (cerrado 2026-08-28):** deploy + env + 3 webhooks + GitHub conectado (`temporary-snappy-walnut-fsw66dt.vercel.app`). Commitear HMAC/scripts antes del próximo push a `main`.
- Cache-bust `shopify-global.js` y `shopify-products.js` (H6) — spec ya escrita.
- Alinear copy de envío carrito vs FAQ (H5) cuando Juan defina la regla comercial.
- Agregar o quitar referencia `hero.jpg` de fences (M2).
- Corregir README de inventory-sync (fórmula Juego / quién escribe vitrina) (M1).
- Verificar stock `RES-REP` Natural vs reposeras cargadas (M10).
- Completar o redirigir `gracias.html` y links de redes (M3).
- Documentar `orders/cancelled` en el README de la app (M12).
- Aclarar en el admin que Tienda es BOM, no un GET a Shopify (H7).

## Medianas (días, tocar inventario o UX con cuidado)

- Política de stock por tela: usar `allocateSharedStructurePool` vs dejar sobre-conteo documentado (H2). Cambio de Recalcular = cambio de vitrina. Requiere decisión de negocio + tests.
- Idempotencia durable de webhooks (H3/H4): no taguear como “listo” antes del descuento; o usar un store (Shopify metafield / KV) en lugar del Map.
- Unificar CSS navbar / overflow mobile (M4/M5) — Sally/`bmad-ux` ya auditó; no mezclar con inventario.
- Alertas WhatsApp: validar umbrales vs operación real (mesa = 2 es warning).
- Distinguir en admin “fabricable BOM” vs “qty vitrina Shopify” para no operar a ciegas (H1).

## Estructurales (semanas, no empezar en el mismo PR)

- Spine de arquitectura brownfield (`bmad-architecture`) anclado a estos `docs/`, no a un sistema ideal.
- Backlog priorizado (`bmad-prd` ligero o epics) separado: (1) tienda/UX, (2) inventario/BOM, (3) hosting/observabilidad.
- `bmad-project-context` → bloque `AGENTS.md` **con aprobación de Juan** (pitfalls: no Recalcular post-Natural, no publicar piezas, dual hosting).
- Observabilidad: log/alerta si webhook falla o si vitrina ≠ BOM por más de N unidades.
- Performance de imágenes / SEO técnico (sitemap) solo con medición.
- No migrar el sitio a React/Next: fuera de alcance reiterado en auditoría UX.

## Cómo pedir trabajo a partir de ahora

1. Juan describe el cambio.
2. El agente lee `docs/` (y `_bmad-output` si hay spec).
3. Elige skill: spec → build → review (ver plan en el informe de discovery).
4. Si el cambio altera stock, checkout o IDs: parar y confirmar.
5. Actualizar el markdown de `docs/` que haya quedado mentiroso.
