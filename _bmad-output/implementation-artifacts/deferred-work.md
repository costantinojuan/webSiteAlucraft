# Deferred work

- source_spec: `_bmad-output/implementation-artifacts/spec-unify-shopify-home-cart.md`
  summary: Agregar cache-busting a `/shopify-global.js` y `/shopify-products.js` en el deploy.
  evidence: Tras publicar, un `index.html` nuevo con un `shopify-products.js` viejo en caché volvería a embeber cart/toggle y duplicaría el carrito. Hoy los JS se cargan sin query de versión (a diferencia de `pagina3/style.css?v=typo3`).

- source_spec: `_bmad-output/implementation-artifacts/spec-limpieza-optimizacion.md`
  summary: Falta `fences/multimedia/hero.jpg` referenciado por `fences/style.css`; hoy solo hay fallback de degradé.
  evidence: Preexistente; la spec de limpieza prohibió tocarlo (Ask First). Cada carga de Fences pide un JPG 404.
