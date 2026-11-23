// Captura las pantallas de la demo local de PlatLab para el sitio. SOLO LECTURA:
//  - inicia sesión con las cuentas demo y navega; no crea ni cambia nada del negocio,
//  - aborta cualquier petición que no sea GET hacia la API de la app (guardia),
//  - escribe únicamente en este proyecto (public/capturas y el manifiesto).
//
// Uso:  pnpm capturar [id ...] [--debug]
//   --debug  deja en /tmp/platlab-debug una copia con las cajas dibujadas, para revisarlas.
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CUENTAS, TOMAS, WS } from './tomas.mjs';
import { TOMAS_MOVIL } from './tomas-movil.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.PLATLAB_URL ?? 'http://localhost:5173';
const SALIDA = join(RAIZ, 'public', 'capturas');
const MANIFIESTO = join(RAIZ, 'src', 'modules', 'capturas', 'manifiesto.json');
const DEBUG_DIR = '/tmp/platlab-debug';
const PASSWORD = 'platlab-demo';

const args = process.argv.slice(2);
const debug = args.includes('--debug');
const ids = args.filter((a) => !a.startsWith('--'));

mkdirSync(SALIDA, { recursive: true });
mkdirSync(dirname(MANIFIESTO), { recursive: true });
if (debug) mkdirSync(DEBUG_DIR, { recursive: true });

const manifiesto = existsSync(MANIFIESTO) ? JSON.parse(readFileSync(MANIFIESTO, 'utf8')) : {};
const browser = await chromium.launch();
const sesiones = new Map();

/** Una sesión por cuenta y tamaño de pantalla, con la guardia de solo lectura. */
async function sesion(cuenta, movil) {
  const clave = `${cuenta}:${movil ? 'm' : 'd'}`;
  if (sesiones.has(clave)) return sesiones.get(clave);
  const context = await browser.newContext({
    viewport: movil ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: 'es-EC',
    timezoneId: 'America/Guayaquil',
    isMobile: Boolean(movil),
    hasTouch: Boolean(movil),
    reducedMotion: 'reduce',
  });
  // Guardia: ninguna escritura contra la API de la app.
  // (El inicio de sesión va a Auth, en otro origen; es lo único que escribe y es una sesión, no negocio.)
  await context.route(/^https?:\/\/(localhost:5173|127\.0\.0\.1:3000)\/v1\//, (route) => {
    if (route.request().method() === 'GET') return route.continue();
    console.error('BLOQUEADO (solo lectura):', route.request().method(), route.request().url());
    return route.abort();
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/acceso`);
  await page.getByLabel('Correo').fill(CUENTAS[cuenta]);
  await page.getByLabel('Contraseña').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/\/(e\/|espacios)/);
  sesiones.set(clave, page);
  return page;
}

async function asentar(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running')).catch(() => {});
  await page.waitForTimeout(600);
  await page.addStyleTag({ content: '[data-sonner-toaster]{visibility:hidden!important}' });
}

const redondear = (n) => Math.round(n * 100) / 100;

async function tomar(toma, movil) {
  const page = await sesion(toma.cuenta ?? 'admin', movil);
  await page.goto(`${BASE}/e/${WS}${toma.ruta ? `/${toma.ruta}` : ''}`);
  await asentar(page);
  if (toma.antes) {
    await toma.antes(page);
    await asentar(page);
  }
  await page.evaluate(() => window.scrollTo(0, 0));

  const r = toma.recorte;
  const png = await page.screenshot({ clip: { x: r.x, y: r.y, width: r.w, height: r.h }, fullPage: true });

  const marcas = [];
  for (const m of toma.marcas) {
    let caja = m.rect;
    if (m.loc) {
      const b = await m.loc(page).boundingBox();
      if (!b) throw new Error(`${toma.id}: marca ${m.n} sin elemento`);
      const pad = m.pad ?? 4;
      caja = { x: b.x - pad, y: b.y - pad, w: b.width + pad * 2, h: b.height + pad * 2 };
    }
    // A coordenadas del recorte, acotadas a la imagen.
    const x0 = Math.max(0, caja.x - r.x);
    const y0 = Math.max(0, caja.y - r.y);
    const x1 = Math.min(r.w, caja.x - r.x + caja.w);
    const y1 = Math.min(r.h, caja.y - r.y + caja.h);
    marcas.push({
      n: m.n,
      titulo: m.titulo,
      texto: m.texto,
      tipo: m.tipo,
      lado: m.lado,
      caja: { x: redondear((x0 / r.w) * 100), y: redondear((y0 / r.h) * 100), w: redondear(((x1 - x0) / r.w) * 100), h: redondear(((y1 - y0) / r.h) * 100) },
    });
  }

  const archivo = `${toma.id}.webp`;
  const base = sharp(png);
  await base.clone().resize({ width: Math.min(1800, r.w * 2), withoutEnlargement: true }).webp({ quality: 84, effort: 5 }).toFile(join(SALIDA, archivo));

  if (debug) {
    const meta = await base.metadata();
    const k = meta.width / r.w;
    const rects = marcas
      .map((m) => `<rect x="${(m.caja.x / 100) * r.w * k}" y="${(m.caja.y / 100) * r.h * k}" width="${(m.caja.w / 100) * r.w * k}" height="${(m.caja.h / 100) * r.h * k}" fill="none" stroke="#e11d48" stroke-width="6"/><text x="${(m.caja.x / 100) * r.w * k + 8}" y="${(m.caja.y / 100) * r.h * k + 44}" font-size="44" fill="#e11d48" font-weight="700">${m.n}</text>`)
      .join('');
    const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width}" height="${meta.height}">${rects}</svg>`);
    const compuesta = await base.clone().composite([{ input: svg }]).png().toBuffer();
    await sharp(compuesta).resize({ width: 1400 }).png().toFile(join(DEBUG_DIR, `${toma.id}.png`));
  }

  manifiesto[toma.id] = {
    id: toma.id,
    archivo: `/capturas/${archivo}`,
    ancho: r.w,
    alto: r.h,
    alt: toma.alt,
    direccion: toma.direccion,
    marco: movil ? 'telefono' : 'ventana',
    marcas,
  };
  console.log('ok', toma.id, `${r.w}×${r.h}`);
}

try {
  const todas = [...TOMAS.map((t) => [t, false]), ...TOMAS_MOVIL.map((t) => [t, true])];
  for (const [toma, movil] of todas) {
    if (ids.length && !ids.includes(toma.id)) continue;
    await tomar(toma, movil);
  }
} finally {
  writeFileSync(MANIFIESTO, `${JSON.stringify(manifiesto, null, 2)}\n`);
  await browser.close();
}
