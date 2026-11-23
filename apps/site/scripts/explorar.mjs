// Exploración de SOLO LECTURA: recorre las secciones de cada módulo y guarda vistas previas en scratch.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.PLATLAB_URL ?? 'http://localhost:5173';
const OUT = process.argv[2] ?? '/tmp/platlab-explore';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-EC', timezoneId: 'America/Guayaquil' });
const page = await ctx.newPage();
await page.goto(`${BASE}/acceso`);
await page.getByLabel('Correo').fill('admin@demo.platlab.test');
await page.getByLabel('Contraseña').fill('platlab-demo');
await page.getByRole('button', { name: 'Entrar' }).click();
await page.waitForURL(/\/e\//);
await page.goto(`${BASE}/e/dc000000-0000-4000-8000-00000000000a`);
await page.getByRole('link', { name: 'Ir a Facultad de Ciencias' }).click();
await page.waitForTimeout(2000);
const home = page.url();
console.log('HOME', home);
console.log((await page.$$eval('a[href]', (as) => as.map((a) => `${a.textContent?.trim().slice(0, 30)} -> ${a.getAttribute('href')}`))).join('\n'));
for (const mod of ['Reactivos', 'Equipos', 'Laboratorios', 'Mantenimiento', 'Materiales']) {
  await page.goto(home);
  await page.waitForTimeout(800);
  await page.getByRole('link', { name: new RegExp(mod) }).first().click({ timeout: 5000 }).catch(() => console.log('sin enlace', mod));
  await page.waitForTimeout(1500);
  console.log(mod, page.url());
  const nav = await page.$$eval('nav a[href]', (as) => as.map((a) => `${a.textContent?.trim()} -> ${a.getAttribute('href')}`));
  console.log('  ', nav.join('\n   '));
  await page.screenshot({ path: `${OUT}/${mod}.png` });
}
await browser.close();
