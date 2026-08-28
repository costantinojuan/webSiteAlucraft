# Documentación del sistema Alucraft

Fuente de verdad para agentes y personas. Describe **el sistema actual**, no un diseño ideal.

Idioma: español. Generada en discovery 2026-08-28 a partir del repo (código, `.htaccess`, `.cpanel.yml`, `shopify-inventory-sync/README.md`, `_bmad-output/`). Segunda pasada: auditorías de sitio estático, app de inventario y git/seguridad.

| Documento | Contenido |
|---|---|
| [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) | Qué es el producto y cómo se parte |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Componentes, hosting, conexiones |
| [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) | Catálogo, variantes, bundle Juego |
| [SHOPIFY_INTEGRATION.md](./SHOPIFY_INTEGRATION.md) | Buy Button, Admin API, webhooks |
| [INVENTORY_LOGIC.md](./INVENTORY_LOGIC.md) | BOM, pintura, recálculo, panel |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | cPanel + GitHub + Vercel |
| [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) | Problemas verificados, por prioridad |
| [ROADMAP.md](./ROADMAP.md) | Mejoras rápidas / medianas / estructurales |

**Regla:** si un cambio altera comportamiento, actualizá el archivo que corresponda en el mismo trabajo.

Carpeta BMAD de planning/implementación (no reemplaza esto): `_bmad-output/`.

UNKNOWN / NEEDS VERIFICATION se marca en los docs cuando el código no alcanza.
