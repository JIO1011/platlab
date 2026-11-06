import AxeBuilder from '@axe-core/playwright';
import { expect, type Browser, type Locator, type Page } from '@playwright/test';

/** Lo que comparten los recorridos de Playwright: entrar, capturar y revisar accesibilidad con axe. */
export const password = 'platlab-demo';
const reviewDir = '.impeccable/review';

export async function signIn(browser: Browser, email: string, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport, locale: 'es-EC', timezoneId: 'America/Guayaquil' });
  const page = await context.newPage();
  await page.goto('/acceso');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  return page;
}

/**
 * Captura válida para la revisión: desde arriba, con el movimiento asentado y sin avisos encima.
 * Con `keepScroll`, donde la página dejó a la persona (p. ej., el frasco de una etiqueta QR).
 */
export async function capture(page: Page, name: string, fullPage = true, keepScroll = false) {
  if (!keepScroll) await page.evaluate(() => window.scrollTo(0, 0));
  // Sin transiciones a medias: una captura tomada durante un fundido no es evidencia.
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== 'running'));
  // Los avisos se ocultan solo durante la foto: quitarlos del DOM rompería los siguientes.
  const hide = await page.addStyleTag({ content: '[data-sonner-toaster] { visibility: hidden !important; }' });
  await page.screenshot({ path: `${reviewDir}/${name}.png`, fullPage });
  await hide.evaluate((style) => style.remove());
}

/** WCAG 2.2 AA con axe en la pantalla tal como está (ADR 0010). */
export async function expectAccessible(page: Page, label: string) {
  // Un color a mitad de una transición no es el estado de la pantalla: se espera a que termine.
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== 'running'));
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    results.violations.map((v) => `${label}: ${v.id} → ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
  ).toEqual([]);
}

/** Captura recortada a un elemento (un bloque, una hoja), con las animaciones asentadas y sin avisos encima. */
export async function captureElement(target: Locator, name: string) {
  const page = target.page();
  await target.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== 'running'));
  const hide = await page.addStyleTag({ content: '[data-sonner-toaster] { visibility: hidden !important; }' });
  await target.screenshot({ path: `${reviewDir}/${name}.png` });
  await hide.evaluate((style) => style.remove());
}
