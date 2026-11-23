// Junta en infra/cloudflare/dist los activos que sirve el Worker (ADR 0033): el sitio público ocupa la raíz y la
// app aporta sus archivos (/assets/, /ghs/) y su index.html en /_app/, que el Worker entrega en las rutas de la app.
// Requiere las compilaciones de apps/site (out) y apps/web (dist).
import { appendFileSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const path = (relative) => fileURLToPath(new URL(relative, import.meta.url));
const site = path('../../apps/site/out/');
const web = path('../../apps/web/dist/');
const out = path('./dist/');

for (const build of [site, web]) {
  if (!existsSync(build)) throw new Error(`Falta la compilación ${build}`);
}

rmSync(out, { recursive: true, force: true });
cpSync(site, out, { recursive: true });

for (const entry of readdirSync(web)) {
  if (entry === 'index.html') continue;
  if (existsSync(out + entry)) throw new Error(`La app y el sitio publican el mismo archivo: /${entry}`);
  cpSync(web + entry, out + entry, { recursive: true });
}
mkdirSync(out + '_app');
cpSync(web + 'index.html', out + '_app/index.html');

// El _headers del sitio aplica su CSP y su Permissions-Policy a todo (/*). La app no puede llevarlas: llama a Supabase
// desde el navegador y usa la cámara para leer etiquetas. Las demás cabeceras del sitio sí le valen.
appendFileSync(
  out + '_headers',
  ['/_app/*', '/assets/*', '/ghs/*']
    .map((rule) => `\n${rule}\n  ! Content-Security-Policy\n  ! Permissions-Policy\n`)
    .join(''),
);
