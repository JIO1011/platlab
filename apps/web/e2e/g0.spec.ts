import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * Recorrido visible de G0 (primer incremento, «Evidencia para cerrar G0», punto 1) con las cuentas
 * de la demo sintética (supabase/seeds/demo.sql). Cada persona usa su propio navegador.
 */
const password = 'platlab-demo';
const suffix = Date.now().toString(36).toUpperCase();
const product = { code: `NACL-${suffix}`, name: `Cloruro de sodio ${suffix}`, lot: `L-${suffix}` };
const reviewDir = '.impeccable/review';

async function signIn(browser: Browser, email: string, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport, locale: 'es-EC', timezoneId: 'America/Guayaquil' });
  const page = await context.newPage();
  await page.goto('/acceso');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  return page;
}

/** Captura válida para la revisión: desde arriba, con el movimiento asentado y sin avisos encima. */
async function capture(page: Page, name: string, fullPage = true) {
  await page.evaluate(() => window.scrollTo(0, 0));
  // Sin transiciones a medias: una captura tomada durante un fundido no es evidencia.
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== 'running'));
  await page.locator('[data-sonner-toast]').evaluateAll((toasts) => toasts.forEach((toast) => toast.remove()));
  await page.screenshot({ path: `${reviewDir}/${name}.png`, fullPage });
}

/** WCAG 2.2 AA con axe en la pantalla tal como está (ADR 0010). */
async function expectAccessible(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    results.violations.map((v) => `${label}: ${v.id} → ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
  ).toEqual([]);
}

async function openReagents(page: Page, workspace: string) {
  await page.getByRole('link', { name: new RegExp(workspace) }).click();
  await page.getByRole('link', { name: 'Abrir Reactivos' }).click();
  await expect(page.getByRole('heading', { name: 'Reactivos', level: 1 })).toBeVisible();
}

async function choose(page: Page, label: string, option: RegExp | string) {
  await page.getByLabel(label).click();
  await page.getByRole('option', { name: option }).click();
}

const productRows = (page: Page) => page.getByRole('rowgroup').filter({ hasText: product.name });

test('el acceso es accesible y se ve en escritorio', async ({ page }) => {
  await page.goto('/acceso');
  await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
  await expectAccessible(page, 'acceso');
  await capture(page, 'desktop-login');
});

test('G0: 100 g, salida de 20 g y ajuste de −0,5 g dejan 79,5 g, con responsables', async ({ browser }) => {
  // La Administradora crea el reactivo y su lote.
  const admin = await signIn(browser, 'admin@demo.platlab.test');
  await expect(admin.getByRole('heading', { name: 'Elige un espacio de trabajo' })).toBeVisible();
  await expectAccessible(admin, 'selector');
  await capture(admin, 'desktop-selector');
  await openReagents(admin, 'Laboratorio de Química');

  await admin.getByRole('button', { name: 'Nuevo reactivo' }).first().click();
  const productSheet = admin.getByRole('dialog', { name: 'Nuevo reactivo' });
  await productSheet.getByLabel('Código').fill(product.code);
  await productSheet.getByLabel('Nombre').fill(product.name);
  await productSheet.getByLabel('Número CAS').fill('7647-14-5');
  await expectAccessible(admin, 'hoja nuevo reactivo');
  await capture(admin, 'desktop-sheet', false);
  await productSheet.getByRole('button', { name: 'Crear reactivo' }).click();
  await expect(admin.getByText('Reactivo creado')).toBeVisible();

  await productRows(admin).getByRole('button', { name: 'Nuevo lote' }).click();
  const lotSheet = admin.getByRole('dialog', { name: 'Nuevo lote' });
  await lotSheet.getByLabel('Código del lote').fill(product.lot);
  await lotSheet.getByRole('button', { name: 'Crear lote' }).click();
  await expect(admin.getByText('Lote creado')).toBeVisible();

  // El Operador registra el ingreso y la salida, y no puede ajustar.
  const operator = await signIn(browser, 'operador@demo.platlab.test');
  await openReagents(operator, 'Laboratorio de Química');
  await expect(operator.getByRole('button', { name: 'Ajustar' })).toHaveCount(0);
  await expect(operator.getByRole('button', { name: 'Nuevo reactivo' })).toHaveCount(0);

  await productRows(operator).getByRole('button', { name: 'Ingreso' }).click();
  const receipt = operator.getByRole('dialog', { name: 'Registrar ingreso' });
  await choose(operator, 'Lote', product.lot);
  await choose(operator, 'Ubicación', /Almacén de reactivos/);
  await receipt.getByLabel('Cantidad').fill('100');
  await expect(receipt.getByText('Se registrará')).toContainText('+100');
  await receipt.getByRole('button', { name: 'Registrar ingreso' }).click();
  await expect(operator.getByText('Saldo en la ubicación: 100 g')).toBeVisible();

  await productRows(operator).getByRole('button', { name: 'Salida' }).click();
  const issue = operator.getByRole('dialog', { name: 'Registrar salida' });
  await issue.getByLabel('Cantidad').fill('20');
  await issue.getByLabel('Motivo').fill('Práctica de Química General');
  await issue.getByLabel('Destino').fill('Laboratorio 1');
  await issue.getByRole('button', { name: 'Registrar salida' }).click();
  await expect(operator.getByText('Saldo en la ubicación: 80 g')).toBeVisible();
  await expect(productRows(operator).getByText('80 g', { exact: true }).first()).toBeVisible();

  // La Administradora ajusta por conteo.
  await admin.reload();
  await productRows(admin).getByRole('button', { name: 'Ajustar' }).click();
  const adjustment = admin.getByRole('dialog', { name: 'Ajustar existencias' });
  await adjustment.getByLabel('Diferencia').fill('0,5');
  await adjustment.getByLabel('Motivo').fill('Conteo');
  await adjustment.getByRole('button', { name: 'Registrar ajuste' }).click();
  await expect(admin.getByText('Saldo en la ubicación: 79,5 g')).toBeVisible();
  await expect(productRows(admin).getByText('79,5 g', { exact: true }).first()).toBeVisible();
  await expectAccessible(admin, 'inventario');
  await capture(admin, 'desktop');

  // El selector de ubicación agrupa por reactivo: el de esta prueba aparece una sola vez.
  await admin.getByRole('button', { name: 'Registrar salida' }).click();
  const issueSheet = admin.getByRole('dialog', { name: 'Registrar salida' });
  await issueSheet.getByLabel('Desde').click();
  await expect(admin.getByRole('group', { name: product.name })).toHaveCount(1);
  await expect(admin.getByRole('group', { name: product.name }).getByRole('option')).toHaveCount(1);
  await capture(admin, 'desktop-select', false);
  await admin.keyboard.press('Escape');
  await admin.keyboard.press('Escape');
  await expect(issueSheet).toHaveCount(0);

  await admin.getByRole('tab', { name: 'Movimientos' }).click();
  const history = admin.getByRole('row').filter({ hasText: product.name });
  await expect(history).toHaveCount(3);
  await expect(history.nth(0)).toContainText('Ajuste');
  await expect(history.nth(0)).toContainText('Ana Administradora');
  await expect(history.nth(1)).toContainText('Salida');
  await expect(history.nth(1)).toContainText('Óscar Operador');
  await expect(history.nth(2)).toContainText('Ingreso');
  await expectAccessible(admin, 'movimientos');
  await capture(admin, 'desktop-movements');

  await admin.getByRole('link', { name: 'Inicio', exact: true }).click();
  await expect(admin.getByText(/reactivos? con existencias/)).toBeVisible();
  await expectAccessible(admin, 'inicio');
  await capture(admin, 'desktop-home');
});

test('C sin Reactivos no lo ve; la propietaria sin rol operativo tampoco opera', async ({ browser }) => {
  const admin = await signIn(browser, 'admin@demo.platlab.test');
  await admin.getByRole('link', { name: /Laboratorio de Física/ }).click();
  await expect(admin.getByText('No hay módulos para tu rol en este espacio')).toBeVisible();
  await expect(admin.getByRole('link', { name: 'Reactivos' })).toHaveCount(0);
  await expectAccessible(admin, 'inicio C');
  const workspaceUrl = admin.url();
  await admin.goto(`${workspaceUrl}/reactivos`);
  await expect(admin.getByText('Módulo no disponible')).toBeVisible();

  const owner = await signIn(browser, 'propietaria@demo.platlab.test');
  await expect(owner.getByRole('heading', { level: 1 })).toContainText('Paula');
  await expect(owner.getByText('No hay módulos para tu rol en este espacio')).toBeVisible();
  await expect(owner.getByRole('link', { name: 'Reactivos' })).toHaveCount(0);
});

test('en el móvil, el Inicio y el tablero se adaptan desde 360 px', async ({ browser }) => {
  const operator = await signIn(browser, 'operador@demo.platlab.test', { width: 360, height: 780 });
  await operator.getByRole('link', { name: /Laboratorio de Biología/ }).click();
  await expect(operator.getByRole('link', { name: 'Abrir Reactivos' })).toBeVisible();
  await expect(operator.getByText('Laboratorio de Biología').first()).toBeVisible();
  await expect(operator.getByRole('heading', { name: 'Actividad reciente' })).toBeVisible();
  await expectAccessible(operator, 'inicio móvil');
  expect(await operator.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await capture(operator, 'mobile-home');

  // Una acción rápida del Inicio abre su hoja en el tablero.
  await operator.getByRole('link', { name: 'Registrar salida' }).click();
  await expect(operator.getByRole('dialog', { name: 'Registrar salida' })).toBeVisible();
  await operator.keyboard.press('Escape');
  await expect(operator.getByRole('dialog', { name: 'Registrar salida' })).toHaveCount(0);
  await operator.getByRole('link', { name: 'Inicio', exact: true }).click();
  await operator.getByRole('link', { name: 'Abrir Reactivos' }).click();
  await expect(operator.getByRole('heading', { name: /Etanol 96 %/ })).toBeVisible();
  await expectAccessible(operator, 'tablero móvil');
  await capture(operator, 'mobile');
  await operator.getByRole('tab', { name: 'Movimientos' }).click();
  await expect(operator.getByRole('tab', { name: 'Movimientos' })).toHaveAttribute('aria-selected', 'true');
  await expect(operator.getByRole('tab', { name: 'Inventario' })).toHaveAttribute('aria-selected', 'false');
  await expect(operator.getByRole('listitem').filter({ hasText: 'Etanol 96 %' }).first()).toBeVisible();
  await capture(operator, 'mobile-movements');
  // La página nunca se desplaza en horizontal: si una tabla no cabe, se desplaza dentro de su panel.
  expect(await operator.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await operator.getByRole('tab', { name: 'Inventario' }).click();

  await operator.getByRole('button', { name: 'Salida' }).first().click();
  await expect(operator.getByRole('dialog', { name: 'Registrar salida' })).toBeVisible();
  await expectAccessible(operator, 'hoja móvil');
  await capture(operator, 'mobile-sheet', false);
});

test('en tableta (820 px), Inicio y tablero conservan la barra lateral y usan listas sin desplazarse en horizontal', async ({ browser }) => {
  const admin = await signIn(browser, 'admin@demo.platlab.test', { width: 820, height: 1180 });
  await admin.getByRole('link', { name: /Laboratorio de Química/ }).click();
  await expect(admin.getByRole('heading', { name: 'Actividad reciente' })).toBeVisible();
  await expect(admin.getByRole('complementary')).toBeVisible();
  expect(await admin.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectAccessible(admin, 'inicio tableta');
  await capture(admin, 'tablet-home');

  await admin.getByRole('link', { name: 'Abrir Reactivos' }).click();
  await expect(admin.getByRole('heading', { name: 'Reactivos', level: 1 })).toBeVisible();
  await expect(admin.getByRole('button', { name: 'Registrar salida' })).toBeVisible();
  expect(await admin.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  // Por debajo de 1024 px el inventario y el historial son listas: nada se corta dentro del panel.
  await expect(admin.getByRole('table')).toHaveCount(0);
  await expectAccessible(admin, 'tablero tableta');
  await capture(admin, 'tablet');
  await admin.getByRole('tab', { name: 'Movimientos' }).click();
  await expect(admin.getByRole('listitem').first()).toBeVisible();
  expect(await admin.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await capture(admin, 'tablet-movements');
});

/**
 * Estados del paso 5 que antes solo se probaban por API. Stock insuficiente, sin permiso y sesión
 * expirada usan la API real; consulta y error simulan solo la respuesta, porque cambiar el estado
 * del módulo es del Equipo PlatLab y la decisión del servidor ya la prueba la integración.
 */
test('stock insuficiente: la salida se rechaza en el formulario y el saldo no cambia', async ({ browser }) => {
  const operator = await signIn(browser, 'operador@demo.platlab.test');
  await openReagents(operator, 'Laboratorio de Biología');
  const ethanol = operator.getByRole('rowgroup').filter({ hasText: 'Etanol 96 %' });
  await expect(ethanol.getByText('500 mL', { exact: true }).first()).toBeVisible();

  await ethanol.getByRole('button', { name: 'Salida' }).first().click();
  const issue = operator.getByRole('dialog', { name: 'Registrar salida' });
  await issue.getByLabel('Cantidad').fill('100000');
  await issue.getByLabel('Motivo').fill('Prueba de saldo insuficiente');
  await issue.getByLabel('Destino').fill('Laboratorio 2');
  await issue.getByRole('button', { name: 'Registrar salida' }).click();
  await expect(issue.getByText('No hay saldo suficiente en esa ubicación.')).toBeVisible();
  await expect(issue.getByLabel('Cantidad')).toHaveAttribute('aria-invalid', 'true');
  await expectAccessible(operator, 'hoja con stock insuficiente');
  await capture(operator, 'desktop-insufficient', false);

  await operator.keyboard.press('Escape');
  await expect(issue).toHaveCount(0);
  await operator.reload();
  await expect(ethanol.getByText('500 mL', { exact: true }).first()).toBeVisible();
});

test('sin permiso: la propietaria sin rol que abre Reactivos por URL ve «Sin permiso»', async ({ browser }) => {
  const owner = await signIn(browser, 'propietaria@demo.platlab.test');
  await expect(owner.getByText('No hay módulos para tu rol en este espacio')).toBeVisible();
  await owner.goto(`${owner.url()}/reactivos`);
  await expect(owner.getByRole('heading', { name: 'Sin permiso' })).toBeVisible();
  await expect(owner.getByRole('button', { name: /Registrar/ })).toHaveCount(0);
  await expectAccessible(owner, 'sin permiso');
});

test('modo consulta: sin operación nueva no hay acciones de registro, solo inventario e historial', async ({ browser }) => {
  const admin = await signIn(browser, 'admin@demo.platlab.test');
  // El servidor solo admite consultar y exportar (02 §6); se simula la respuesta de /me.
  await admin.route('**/v1/workspaces/*/me', async (route) => {
    const response = await route.fetch();
    const me = (await response.json()) as { modules: Array<{ code: string; access: string[] }> };
    me.modules = me.modules.map((module) => (module.code === 'reagents' ? { ...module, access: ['read_export'] } : module));
    await route.fulfill({ response, json: me });
  });
  await admin.getByRole('link', { name: /Laboratorio de Química/ }).click();
  await expect(admin.getByRole('link', { name: 'Abrir Reactivos' })).toBeVisible();
  await expect(admin.getByRole('navigation', { name: /Acciones rápidas/ })).toHaveCount(0);

  await admin.getByRole('link', { name: 'Abrir Reactivos' }).click();
  await expect(admin.getByRole('status').filter({ hasText: 'Reactivos está en modo consulta' })).toBeVisible();
  for (const name of ['Registrar salida', 'Registrar ingreso', 'Ajustar', 'Nuevo reactivo', 'Salida', 'Ingreso', 'Nuevo lote']) {
    await expect(admin.getByRole('button', { name, exact: true })).toHaveCount(0);
  }
  await admin.getByRole('tab', { name: 'Movimientos' }).click();
  await expect(admin.getByRole('row').nth(1)).toBeVisible();
  await expectAccessible(admin, 'modo consulta');
  await capture(admin, 'desktop-read-only');
});

test('error: un fallo del servidor muestra «Reintentar» y al reintentar se recupera', async ({ browser }) => {
  const admin = await signIn(browser, 'admin@demo.platlab.test');
  await admin.route('**/v1/workspaces/*/reagents/positions*', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, status: 500, json: { error: { code: 'INTERNAL', message: 'Fallo simulado' } } });
  });
  await openReagents(admin, 'Laboratorio de Química');
  await expect(admin.getByText('No pudimos cargar esta información')).toBeVisible();
  await expectAccessible(admin, 'error');

  await admin.unroute('**/v1/workspaces/*/reagents/positions*');
  await admin.getByRole('button', { name: 'Reintentar' }).click();
  await expect(admin.getByRole('tab', { name: 'Inventario' })).toBeVisible();
  await expect(admin.getByText('No pudimos cargar esta información')).toHaveCount(0);
});

test('sesión expirada: un token que la API rechaza cierra la sesión y vuelve al acceso con aviso', async ({ browser }) => {
  const admin = await signIn(browser, 'admin@demo.platlab.test');
  await expect(admin.getByRole('heading', { name: 'Elige un espacio de trabajo' })).toBeVisible();
  // Firma alterada: la API la verifica contra el JWKS de Auth y responde IDENTITY_INVALID.
  await admin.evaluate(() => {
    const key = Object.keys(localStorage).find((name) => /^sb-.+-auth-token$/.test(name));
    if (!key) throw new Error('No hay sesión guardada');
    const stored = JSON.parse(localStorage.getItem(key) ?? '{}') as { access_token: string };
    const [header, payload] = stored.access_token.split('.');
    localStorage.setItem(key, JSON.stringify({ ...stored, access_token: `${header}.${payload}.firma-alterada` }));
  });
  await admin.reload();
  await expect(admin).toHaveURL(/\/acceso\?sesion=expirada/);
  await expect(admin.getByText('Tu sesión terminó. Vuelve a iniciar sesión para continuar.')).toBeVisible();
  await expectAccessible(admin, 'sesión expirada');
});
