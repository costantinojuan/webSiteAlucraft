# Deferred work

- source_spec: `_bmad-output/implementation-artifacts/spec-unify-shopify-home-cart.md`
  summary: Agregar cache-busting a `/shopify-global.js` y `/shopify-products.js` en el deploy.
  evidence: Tras publicar, un `index.html` nuevo con un `shopify-products.js` viejo en caché volvería a embeber cart/toggle y duplicaría el carrito. Hoy los JS se cargan sin query de versión (a diferencia de `pagina3/style.css?v=typo3`).

- source_spec: `_bmad-output/implementation-artifacts/spec-limpieza-optimizacion.md`
  summary: Falta `fences/multimedia/hero.jpg` referenciado por `fences/style.css`; hoy solo hay fallback de degradé.
  evidence: Preexistente; la spec de limpieza prohibió tocarlo (Ask First). Cada carga de Fences pide un JPG 404.

- source_spec: `_bmad-output/implementation-artifacts/spec-cpanel-git-deploy.md`
  summary: El rsync de `.htaccess` puede pisar el bloque MultiPHP que cPanel inyecta en el hosting.
  evidence: El ZIP ya hacía lo mismo. Si tras el primer Deploy PHP deja de servir, hay que restaurar el handler en MultiPHP; no forma parte de esta spec.

- source_spec: `_bmad-output/implementation-artifacts/spec-cpanel-git-deploy.md`
  summary: Un clone sucio en cPanel deja Deploy deshabilitado hasta limpiar el working tree.
  evidence: Comportamiento de Git Version Control, no del `.cpanel.yml`. Si Deploy no aparece, `git status` en el clone.

- source_spec: `_bmad-output/implementation-artifacts/spec-titulo-terminaciones-overlay.md`
  summary: DESIGN.md y EXPERIENCE.md del run UX 2026-08-24 están vacíos (solo frontmatter).
  evidence: Preexistente; la auditoría vive en auditoria-ux-ui.md. Este overlay se ancló a esa auditoría, no a los spines.
