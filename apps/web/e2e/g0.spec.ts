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

/** Del selector a la app de Reactivos (ADR 0011): la tarjeta del Inicio abre su Resumen. */
async function openReagents(page: Page, workspace: string) {
  await page.getByRole('link', { name: new RegExp(workspace) }).click();
  await page.getByRole('link', { name: 'Abrir Reactivos' }).click();
  await expect(page.getByRole('heading', { name: 'Reactivos', level: 1 })).toBeVisible();
}

/** Una sección del menú de la app del módulo; queda marcada como la página actual. */
async function goTo(page: Page, section: 'Resumen' | 'Inventario' | 'Movimientos') {
  const link = page.getByRole('link', { name: section, exact: true });
  await link.click();
  await expect(link).toHaveAttribute('aria-current', 'page');
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
  await goTo(admin, 'Inventario');

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
  await goTo(operator, 'Inventario');
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

  await goTo(admin, 'Movimientos');
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
});

test('C sin Reactivos no lo ve; la propietaria opera como Administradora sin rol asignado', async ({ browser }) => {
  const admin = await signIn(browser, 'admin@demo.platlab.test');
  await admin.getByRole('link', { name: /Laboratorio de Física/ }).click();
  await expect(admin.getByText('No hay módulos para tu rol en este espacio')).toBeVisible();
  await expect(admin.getByRole('link', { name: /Reactivos/ })).toHaveCount(0);
  await expectAccessible(admin, 'inicio C');
  const workspaceUrl = admin.url();
  await admin.goto(`${workspaceUrl}/reactivos`);
  await expect(admin.getByText('Módulo no disponible')).toBeVisible();

  // ADR 0008, cambio del 02-10-2026: la propietaria tiene los permisos del Administrador.
  const owner = await signIn(browser, 'propietaria@demo.platlab.test');
  await expect(owner.getByRole('heading', { level: 1 })).toContainText('Paula');
  await owner.getByRole('link', { name: 'Abrir Reactivos' }).click();
  await expect(owner.getByRole('heading', { name: 'Reactivos', level: 1 })).toBeVisible();
  for (const name of ['Registrar salida', 'Registrar ingreso', 'Ajustar', 'Nuevo reactivo']) {
    await expect(owner.getByRole('button', { name, exact: true })).toBeVisible();
  }
});

test('en el móvil, el Inicio y la app de Reactivos se adaptan desde 360 px', async ({ browser }) => {
  const operator = await signIn(browser, 'operador@demo.platlab.test', { width: 360, height: 780 });
  await operator.getByRole('link', { name: /Laboratorio de Biología/ }).click();
  await expect(operator.getByRole('link', { name: 'Abrir Reactivos' })).toBeVisible();
  await expect(operator.getByText('Laboratorio de Biología').first()).toBeVisible();
  await expectAccessible(operator, 'inicio móvil');
  expect(await operator.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await capture(operator, 'mobile-home');

  // La tarjeta abre el Resumen; su acción primaria abre la hoja de salida.
  await operator.getByRole('link', { name: 'Abrir Reactivos' }).click();
  await expect(operator.getByRole('heading', { name: 'Actividad reciente' })).toBeVisible();
  await expectAccessible(operator, 'resumen móvil');
  expect(await operator.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await capture(operator, 'mobile-summary');
  await operator.getByRole('button', { name: 'Registrar salida' }).click();
  await expect(operator.getByRole('dialog', { name: 'Registrar salida' })).toBeVisible();
  await operator.keyboard.press('Escape');
  await expect(operator.getByRole('dialog', { name: 'Registrar salida' })).toHaveCount(0);

  await goTo(operator, 'Inventario');
  await expect(operator.getByRole('heading', { name: /Etanol 96 %/ })).toBeVisible();
  await expectAccessible(operator, 'inventario móvil');
  await capture(operator, 'mobile');
  await goTo(operator, 'Movimientos');
  await expect(operator.getByRole('listitem').filter({ hasText: 'Etanol 96 %' }).first()).toBeVisible();
  await capture(operator, 'mobile-movements');
  // La página nunca se desplaza en horizontal: si una tabla no cabe, se desplaza dentro de su panel.
  expect(await operator.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await goTo(operator, 'Inventario');

  await operator.getByRole('button', { name: 'Salida' }).first().click();
  await expect(operator.getByRole('dialog', { name: 'Registrar salida' })).toBeVisible();
  await expectAccessible(operator, 'hoja móvil');
  await capture(operator, 'mobile-sheet', false);
});

test('en tableta (820 px), Inicio y la app conservan la barra lateral y usan listas sin desplazarse en horizontal', async ({ browser }) => {
  const admin = await signIn(browser, 'admin@demo.platlab.test', { width: 820, height: 1180 });
  await admin.getByRole('link', { name: /Laboratorio de Química/ }).click();
  await expect(admin.getByRole('link', { name: 'Abrir Reactivos' })).toBeVisible();
  await expect(admin.getByRole('complementary')).toBeVisible();
  expect(await admin.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectAccessible(admin, 'inicio tableta');
  await capture(admin, 'tablet-home');

  await admin.getByRole('link', { name: 'Abrir Reactivos' }).click();
  await expect(admin.getByRole('heading', { name: 'Reactivos', level: 1 })).toBeVisible();
  await expect(admin.getByRole('button', { name: 'Registrar salida' })).toBeVisible();
  expect(await admin.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await capture(admin, 'tablet-summary');
  // Por debajo de 1024 px el inventario y el historial son listas: nada se corta dentro del panel.
  await goTo(admin, 'Inventario');
  await expect(admin.getByRole('table')).toHaveCount(0);
  await expectAccessible(admin, 'inventario tableta');
  await capture(admin, 'tablet');
  await goTo(admin, 'Movimientos');
  await expect(admin.getByRole('listitem').first()).toBeVisible();
  expect(await admin.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await capture(admin, 'tablet-movements');
});

test('Resumen: cifras que abren su lista y salidas por día con puntero, teclado y tabla', async ({ browser }) => {
  const admin = await signIn(browser, 'admin@demo.platlab.test');
  await admin.getByRole('link', { name: /Laboratorio de Química/ }).click();
  // La tarjeta del Inicio resume el módulo con datos reales del historial de la demo.
  await expect(admin.getByText(/\d+ salidas? en los últimos 30 días/)).toBeVisible();
  await capture(admin, 'desktop-home');

  await admin.getByRole('link', { name: 'Abrir Reactivos' }).click();
  await expect(admin.getByRole('heading', { name: 'Salidas por día' })).toBeVisible();
  const chart = admin.getByRole('group', { name: /Salidas por día, últimos 30 días: \d+ salidas en total/ });
  // Teclado: Fin lleva al día de hoy, que se anuncia y se muestra igual que con el puntero.
  await chart.focus();
  await admin.keyboard.press('End');
  await expect(admin.getByText(/^[a-záéíóú]+, \d+ de [a-z]+: \d+ salidas?$/)).toBeAttached();
  await expect(admin.getByText(/^\d+ salidas?$/)).toBeVisible();
  await expectAccessible(admin, 'resumen');
  await capture(admin, 'desktop-summary');
  await chart.hover({ position: { x: 20, y: 150 } });
  await expect(admin.getByText(/^\d+ salidas?$/)).toBeVisible();
  await admin.getByText('Ver los datos en tabla').click();
  await expect(admin.getByRole('table').getByRole('row')).toHaveCount(31);

  // El selector de módulos marca el actual; la cifra de salidas abre Movimientos.
  await admin.getByRole('button', { name: 'Reactivos. Cambiar de módulo' }).click();
  await expect(admin.getByRole('menuitem', { name: /Reactivos/ })).toBeVisible();
  await admin.keyboard.press('Escape');
  await admin.getByRole('link', { name: /Salidas, últimos 30 días/ }).click();
  await expect(admin.getByRole('heading', { name: 'Movimientos', level: 1 })).toBeVisible();
  // La lista llega filtrada como la cifra: solo salidas de los últimos 30 días, y el filtro se quita.
  await expect(admin.getByText('Salidas · últimos 30 días')).toBeVisible();
  const rows = admin.getByRole('row');
  await expect(rows.nth(1)).toBeVisible();
  for (const row of await rows.all()) {
    if ((await row.getByRole('cell').count()) > 0) await expect(row).toContainText('Salida');
  }
  await expectAccessible(admin, 'movimientos filtrados');
  await capture(admin, 'desktop-movements-filtered', false);
  await admin.getByRole('button', { name: /Quitar el filtro/ }).click();
  await expect(admin.getByText('Salidas · últimos 30 días')).toHaveCount(0);
  await expect(admin.getByRole('row').filter({ hasText: 'Ingreso' }).first()).toBeVisible();
});

/**
 * Estados del paso 5 que antes solo se probaban por API. Stock insuficiente, sin permiso y sesión
 * expirada usan la API real; consulta y error simulan solo la respuesta, porque cambiar el estado
 * del módulo es del Equipo PlatLab y la decisión del servidor ya la prueba la integración.
 */
test('stock insuficiente: la salida se rechaza en el formulario y el saldo no cambia', async ({ browser }) => {
  const operator = await signIn(browser, 'operador@demo.platlab.test');
  await openReagents(operator, 'Laboratorio de Biología');
  await goTo(operator, 'Inventario');
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

test('sin permiso: el docente que abre Reactivos por URL ve «Sin permiso»', async ({ browser }) => {
  const teacher = await signIn(browser, 'docente@demo.platlab.test');
  await expect(teacher.getByText('No hay módulos para tu rol en este espacio')).toBeVisible();
  await teacher.goto(`${teacher.url()}/reactivos`);
  await expect(teacher.getByRole('heading', { name: 'Sin permiso' })).toBeVisible();
  await expect(teacher.getByRole('button', { name: /Registrar/ })).toHaveCount(0);
  await expectAccessible(teacher, 'sin permiso');
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
  await openReagents(admin, 'Laboratorio de Química');
  await expect(admin.getByRole('status').filter({ hasText: 'Reactivos está en modo consulta' })).toBeVisible();
  await goTo(admin, 'Inventario');
  for (const name of ['Registrar salida', 'Registrar ingreso', 'Ajustar', 'Nuevo reactivo', 'Salida', 'Ingreso', 'Nuevo lote']) {
    await expect(admin.getByRole('button', { name, exact: true })).toHaveCount(0);
  }
  await goTo(admin, 'Movimientos');
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
  await admin.getByRole('link', { name: /Laboratorio de Química/ }).click();
  await admin.getByRole('link', { name: 'Abrir Reactivos' }).click();
  await expect(admin.getByText('No pudimos cargar esta información')).toBeVisible();
  await expectAccessible(admin, 'error');

  await admin.unroute('**/v1/workspaces/*/reagents/positions*');
  await admin.getByRole('button', { name: 'Reintentar' }).click();
  await expect(admin.getByRole('heading', { name: 'Reactivos', level: 1 })).toBeVisible();
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
