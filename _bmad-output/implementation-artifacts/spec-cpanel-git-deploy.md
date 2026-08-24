---
title: 'Deploy Git a public_html en cPanel/WNPower'
type: 'chore'
created: '2026-08-24'
status: 'done'
review_loop_iteration: 0
baseline_commit: '1754be51209e4717a74b3da8654e669399a69874'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Hoy el sitio en WNPower se actualiza subiendo un ZIP a `public_html`. Eso es frágil y puede pisar `config.mail.php`. Ya hay clone en `/home/alucraf1/repositories/webSiteAlucraft`.

**Approach:** Un `.cpanel.yml` que copia **solo** los archivos públicos versionados hacia `/home/alucraf1/public_html/` con rsync **sin** `--delete`, para no borrar el SMTP ni otros persistentes.

## Boundaries & Constraints

**Always:**
- `DEPLOYPATH=/home/alucraf1/public_html/`
- Lista explícita de paths de producción (no `cp -R *` ni el repo entero).
- No copiar `config.mail.php` (no está en Git; vive en el server). `enviar.php` sigue haciendo `require` de `__DIR__ . '/config.mail.php'`.
- Sincronizar sin borrar destino: nada de `rm -rf public_html`, `rsync --delete`, ni wipe.

**Ask First:**
- Añadir `--delete` / limpiar huérfanos en el hosting.
- Desplegar `shopify-inventory-sync` a `public_html`.
- Cambiar el clone path o el DEPLOYPATH.

**Never:**
- Tocar Shopify, inventario Vercel, carrito, diseño, `enviar.php` / SMTP.
- Versionar o copiar `config.mail.php`, `.env`, `error_log`.
- Copiar `_bmad/`, `_bmad-output/`, `.agents/`, `.vscode/`, `.git/`, `test-bmad/`, zips, `node_modules`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Deploy | HEAD con `.cpanel.yml` | Archivos públicos actualizados en `public_html` | Si rsync falla, el deploy cPanel muestra error; no wipe |
| SMTP | `config.mail.php` ya en server | El archivo sigue igual; el form envía | N/A |
| Huérfanos | JPG viejos en hosting | Permanecen (no --delete) | N/A |
| Inventory | App en Vercel | No aparece en `public_html` | N/A |

</frozen-after-approval>

## Code Map

**Producción WNPower (incluir):**
- Root: `.htaccess`, `index.html`, `gracias.html`, `enviar.php`, `config.mail.example.php`, `nav.js`, `shopify-global.js`, `shopify-hide-unavailable.js`, `shopify-products.js`, `style.css`
- Dirs: `Logos/`, `PHPMailer/` (`enviar.php` L6–8), `armado/`, `catalogo/`, `fences/`, `fotosSeleccionadas/` (solo webps live), `manualDeArmado/`, `multimedia/`, `multimedia-items/`, `pagina2/`–`pagina5/`

**No incluir:** `config.mail.php` (gitignore; server-only). `shopify-inventory-sync/` (`vercel.json` → Vercel). `_bmad*`, `.agents`, `.vscode`, `.gitignore`, `test-bmad/`, `alucraft-web.zip`, `.git`.

**Persistentes en hosting (no tocar):** `config.mail.php`, `.well-known/`, `error_log`, basura vieja de ZIPs anteriores.

**Crear:** `.cpanel.yml` en la raíz. Formato oficial cPanel (`deployment.tasks` = comandos bash). cwd del deploy = `/home/alucraf1/repositories/webSiteAlucraft`.

**Estrategia:** `export DEPLOYPATH=...` + un `/usr/bin/rsync -a` de la lista explícita hacia `$DEPLOYPATH` **sin** `--delete`. No `chmod` masivo.

**Read-only:** `enviar.php`, `.htaccess`, `shopify-*.js`, inventario.

## Tasks & Acceptance

**Execution:**
- [x] `.cpanel.yml` -- Crear tasks con lista explícita + rsync -a sin --delete a `/home/alucraf1/public_html/` -- Deploy Git seguro.
- [x] Validar YAML (parseo) y que `config.mail.php` no figure en las tasks -- Evita pisar SMTP.

**Acceptance Criteria:**
- Given un deploy cPanel, when corren las tasks, then se actualizan solo paths públicos y `config.mail.php` no se copia ni se borra.
- Given el repo, when se inspecciona `.cpanel.yml`, then no hay wildcard del repo ni `--delete`.

## Spec Change Log

## Design Notes

cPanel documenta `export DEPLOYPATH` + `/bin/cp`. `cp -R Logos $DEST` en Linux puede anidar carpetas si `Logos/` ya existe. `rsync -a origen dest/` actualiza in place. Sin `--delete`, `config.mail.php` y `.well-known` sobreviven. Los JPG de cámara que ya estén en el server no se limpian solos.

## Verification

**Commands:**
- `ruby -ryaml -e "YAML.load_file('.cpanel.yml')"` -- expected: parse OK
- `grep -nE 'config\\.mail\\.php|--delete|rm -rf' .cpanel.yml` -- expected: sin matches
- `grep -nE '\\*|shopify-inventory-sync|_bmad' .cpanel.yml` -- expected: sin matches

**Manual checks:**
- En cPanel: Pull, Deploy HEAD (no borrar public_html). Verificar `config.mail.php` intacto, Home, carrito, contacto.
- Si PHP deja de correr tras el deploy, restaurar el handler MultiPHP en cPanel (el rsync pisa `.htaccess`).

## Suggested Review Order

**Allowlist de rsync**

- Un solo rsync -a a public_html, sin --delete, con la lista explícita del Code Map.
  [`.cpanel.yml:7`](../../.cpanel.yml#L7)

- DEPLOYPATH oficial de cPanel; cada task es un comando bash.
  [`.cpanel.yml:6`](../../.cpanel.yml#L6)

