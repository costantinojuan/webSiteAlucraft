# Deferred work

- source_spec: `_bmad-output/implementation-artifacts/spec-unify-shopify-home-cart.md`
  summary: Agregar cache-busting a `/shopify-global.js` y `/shopify-products.js` en el deploy.
  evidence: Tras publicar, un `index.html` nuevo con un `shopify-products.js` viejo en caché volvería a embeber cart/toggle y duplicaría el carrito. Hoy los JS se cargan sin query de versión (a diferencia de `pagina3/style.css?v=typo3`).
