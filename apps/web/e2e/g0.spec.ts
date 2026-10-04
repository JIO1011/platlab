import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';

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
  // Los avisos se ocultan solo durante la foto: quitarlos del DOM rompería los siguientes.
  const hide = await page.addStyleTag({ content: '[data-sonner-toaster] { visibility: hidden !important; }' });
  await page.screenshot({ path: `${reviewDir}/${name}.png`, fullPage });
  await hide.evaluate((style) => style.remove());
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

/**
 * Entrada directa (ADR 0011): se entra al último espacio usado y se cambia desde su nombre en la
 * barra. Si ya se está en ese espacio, no hace nada.
 */
async function switchTo(page: Page, workspace: string) {
  const trigger = page.getByRole('button', { name: /Cambiar de espacio de trabajo/ });
  await expect(trigger).toBeVisible();
  if (!(await trigger.getAttribute('aria-label'))?.startsWith(workspace)) {
    await trigger.click();
    await page.getByRole('menuitem', { name: new RegExp(workspace) }).click();
  }
  await expect(page.getByRole('button', { name: `${workspace}. Cambiar de espacio de trabajo` })).toBeVisible();
}

/** Del espacio a la app de Reactivos (ADR 0011): la tarjeta del Inicio abre su Resumen. */
async function openReagents(page: Page, workspace: string) {
  await switchTo(page, workspace);
  await page.getByRole('link', { name: 'Abrir Reactivos' }).click();
  await expect(page.getByRole('heading', { name: 'Reactivos', level: 1 })).toBeVisible();
}

/** Una sección del menú de la app del módulo; queda marcada como la página actual. */
async function goTo(page: Page, section: 'Resumen' | 'Inventario' | 'Movimientos' | 'Solicitudes') {
  // Dentro del menú de la app: la ficha también tiene un enlace «Inventario» para volver.
  const link = page.getByRole('navigation').getByRole('link', { name: section, exact: true });
  await link.click();
  await expect(link).toHaveAttribute('aria-current', 'page');
}

/** Motivo o destino de la lista: se pulsa la etiqueta, como una persona, y queda marcado. */
async function pick(scope: Locator, name: string) {
  await scope.locator('label').filter({ hasText: new RegExp(`^${name}$`) }).click();
  await expect(scope.getByRole('radio', { name, exact: true })).toBeChecked();
}

async function choose(page: Page, label: string, option: RegExp | string) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole('option', { name: option }).click();
}

test('el acceso es accesible y se ve en escritorio', async ({ page }) => {
  await page.goto('/acceso');
  await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
  await expectAccessible(page, 'acceso');
  await capture(page, 'desktop-login');
});

test('G0: 100 g, salida de 20 g y ajuste de −0,5 g dejan 79,5 g, con responsables', async ({ browser }) => {
  // La Administradora crea el reactivo y su lote.
  const admin = await signIn(browser, 'admin@demo.platlab.test');
  // Sin pantalla para elegir: entra a un espacio y el nombre en la barra abre los demás.
  await expect(admin.getByRole('heading', { level: 1 })).toContainText('Ana');
  // axe con el menú cerrado: abierto, Radix oculta el resto a los lectores de pantalla mientras
  // atrapa el foco, y axe no conoce esa trampa (lo mismo que con el Select).
  await expectAccessible(admin, 'inicio con cambio de espacio');
  await admin.getByRole('button', { name: /Cambiar de espacio de trabajo/ }).click();
  await expect(admin.getByRole('menuitem', { name: /Laboratorio de Química/ })).toBeVisible();
  await expect(admin.getByRole('menuitem', { name: /Laboratorio de Física/ })).toBeVisible();
  await capture(admin, 'desktop-workspace-switcher', false);
  await admin.keyboard.press('Escape');
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

  // El Operador registra el ingreso por frascos y crea el lote en la misma hoja (ADR 0012, 01 §6.1).
  const operator = await signIn(browser, 'operador@demo.platlab.test');
  await openReagents(operator, 'Laboratorio de Química');
  await goTo(operator, 'Inventario');
  await expect(operator.getByRole('button', { name: 'Ajustar' })).toHaveCount(0);
  await expect(operator.getByRole('button', { name: 'Nuevo reactivo' })).toHaveCount(0);

  await operator.getByRole('button', { name: 'Registrar ingreso' }).click();
  const receipt = operator.getByRole('dialog', { name: 'Registrar ingreso' });
  await choose(operator, 'Reactivo', new RegExp(product.name));
  // El reactivo aún no tiene lotes: el primero se crea aquí.
  await receipt.getByLabel('Código del lote nuevo').fill(product.lot);
  await choose(operator, 'Ubicación', /Almacén de reactivos/);
  await receipt.getByLabel('Cantidad por frasco').fill('100');
  await expect(receipt.getByText('Se registrará')).toContainText('+100');
  await expectAccessible(operator, 'hoja de ingreso');
  await capture(operator, 'desktop-receipt', false);
  await receipt.getByRole('button', { name: 'Registrar ingreso' }).click();
  await expect(operator.getByText('Frasco registrado')).toBeVisible();
  await expect(operator.getByText(`${product.lot}-01 · 100 g cada uno`)).toBeVisible();

  // Dos niveles: la tarjeta del reactivo abre su ficha con sus frascos.
  await operator.getByRole('link', { name: new RegExp(product.name) }).click();
  await expect(operator.getByRole('heading', { name: product.name, level: 1 })).toBeVisible();
  const productUrl = operator.url();
  const frasco = operator.getByRole('article').filter({ hasText: `${product.lot}-01` });
  await expect(frasco.getByText('100 g', { exact: true }).first()).toBeVisible();

  // ADR 0012: la salida del Operador es una solicitud que aparta la cantidad hasta que se aprueba.
  await frasco.getByRole('button', { name: 'Salida' }).click();
  const issue = operator.getByRole('dialog', { name: 'Solicitar salida' });
  await issue.getByLabel('Cantidad', { exact: true }).fill('20');
  await expect(issue.getByText('Quedarán')).toContainText('80');
  await pick(issue, 'Práctica de Química General');
  await pick(issue, 'Laboratorio 1');
  await expectAccessible(operator, 'hoja de salida');
  await capture(operator, 'desktop-issue', false);
  await issue.getByRole('button', { name: 'Enviar solicitud' }).click();
  await expect(operator.getByText('Solicitud enviada')).toBeVisible();
  // El saldo no cambia hasta que se apruebe; lo pedido se ve apartado en el frasco.
  await expect(frasco.getByText('100 g', { exact: true }).first()).toBeVisible();
  await expect(frasco.getByText(/apartados/)).toContainText('20 g');
  await capture(operator, 'desktop-product-requested');

  // La Administradora la aprueba desde Solicitudes: la salida queda a su nombre.
  await goTo(admin, 'Solicitudes');
  const request = admin.getByRole('article').filter({ hasText: product.name });
  await expect(request).toContainText('Óscar Operador');
  await expect(request).toContainText('Práctica de Química General');
  await expectAccessible(admin, 'bandeja de solicitudes');
  await capture(admin, 'desktop-requests');
  await request.getByRole('button', { name: 'Aprobar salida' }).click();
  await expect(admin.getByText(`Quedan 80 g en ${product.lot}-01`)).toBeVisible();
  await expect(request).toHaveCount(0);

  // El Operador la ve aprobada entre todas las suyas, y el frasco con 80 g.
  await goTo(operator, 'Solicitudes');
  await operator.getByRole('link', { name: 'Todas', exact: true }).click();
  const mine = operator.getByRole('article').filter({ hasText: product.name });
  await expect(mine).toContainText('Aprobada');
  await expect(mine).toContainText('Ana Administradora');
  await expectAccessible(operator, 'mis solicitudes');
  await capture(operator, 'desktop-requests-mine');
  await operator.goto(productUrl);
  await expect(frasco.getByText('80 g', { exact: true }).first()).toBeVisible();
  await expect(frasco.getByText(/apartados/)).toHaveCount(0);

  // La Administradora ajusta el frasco por conteo, con un motivo de la lista.
  await admin.goto(productUrl);
  const adminFrasco = admin.getByRole('article').filter({ hasText: `${product.lot}-01` });
  await adminFrasco.getByRole('button', { name: 'Ajustar' }).click();
  const adjustment = admin.getByRole('dialog', { name: 'Ajustar existencias' });
  await adjustment.getByLabel('Diferencia').fill('0,5');
  await pick(adjustment, 'Conteo mensual');
  await adjustment.getByRole('button', { name: 'Registrar ajuste' }).click();
  await expect(admin.getByText('Quedan 79,5 g en el frasco')).toBeVisible();
  await expect(adminFrasco.getByText('79,5 g', { exact: true }).first()).toBeVisible();
  await expectAccessible(admin, 'ficha del reactivo');
  await capture(admin, 'desktop-product');

  // El selector de frascos agrupa por reactivo: el de esta prueba aparece una sola vez.
  await admin.getByRole('button', { name: 'Registrar salida' }).click();
  const issueSheet = admin.getByRole('dialog', { name: 'Registrar salida' });
  await issueSheet.getByLabel('Frasco').click();
  await expect(admin.getByRole('group', { name: product.name })).toHaveCount(1);
  await expect(admin.getByRole('group', { name: product.name }).getByRole('option')).toHaveCount(1);
  await capture(admin, 'desktop-select', false);
  await admin.keyboard.press('Escape');
  await admin.keyboard.press('Escape');
  await expect(issueSheet).toHaveCount(0);

  await goTo(admin, 'Inventario');
  await expectAccessible(admin, 'inventario');
  await capture(admin, 'desktop');

  await goTo(admin, 'Movimientos');
  const history = admin.getByRole('row').filter({ hasText: product.name });
  await expect(history).toHaveCount(3);
  await expect(history.nth(0)).toContainText('Ajuste');
  await expect(history.nth(0)).toContainText('Ana Administradora');
  await expect(history.nth(1)).toContainText('Salida');
  // Aprobada (ADR 0012): responsable la Administradora y, debajo, quien la pidió.
  await expect(history.nth(1)).toContainText('Ana Administradora');
  await expect(history.nth(1)).toContainText('Pidió Óscar Operador');
  await expect(history.nth(2)).toContainText('Ingreso');
  await expectAccessible(admin, 'movimientos');
  await capture(admin, 'desktop-movements');

  await admin.getByRole('link', { name: 'Inicio', exact: true }).click();
  await expect(admin.getByText(/reactivos? con existencias/)).toBeVisible();
  await expectAccessible(admin, 'inicio');
});

test('C sin Reactivos no lo ve; la propietaria opera como Administradora sin rol asignado', async ({ browser }) => {
  const admin = await signIn(browser, 'admin@demo.platlab.test');
  await switchTo(admin, 'Laboratorio de Física');
  await expect(admin.getByText('No hay módulos para tu rol en este espacio')).toBeVisible();
  await expect(admin.getByRole('link', { name: /Reactivos/ })).toHaveCount(0);
  await expectAccessible(admin, 'inicio C');
  const workspaceUrl = admin.url();
  await admin.goto(`${workspaceUrl}/reactivos`);
  await expect(admin.getByText('Módulo no disponible')).toBeVisible();

  // ADR 0008, cambio del 02-10-2026: la propietaria tiene los permisos del Administrador.
  const owner = await signIn(browser, 'propietaria@demo.platlab.test');
  await expect(owner.getByRole('heading', { level: 1 })).toContainText('Paula');
  // Con un solo espacio, su nombre es un título: no hay menú que no lleve a ningún lado.
  await expect(owner.getByRole('button', { name: /Cambiar de espacio de trabajo/ })).toHaveCount(0);
  await expect(owner.getByText('Laboratorio de Química').first()).toBeVisible();
  await owner.getByRole('link', { name: 'Abrir Reactivos' }).click();
  await expect(owner.getByRole('heading', { name: 'Reactivos', level: 1 })).toBeVisible();
  for (const name of ['Registrar salida', 'Registrar ingreso', 'Ajustar', 'Nuevo reactivo']) {
    await expect(owner.getByRole('button', { name, exact: true })).toBeVisible();
  }
});

test('en el móvil, el Inicio y la app de Reactivos se adaptan desde 360 px', async ({ browser }) => {
  const operator = await signIn(browser, 'operador@demo.platlab.test', { width: 360, height: 780 });
  await switchTo(operator, 'Laboratorio de Biología');
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

  // Segundo nivel en el móvil: la ficha con sus frascos, y la salida desde un frasco.
  await operator.getByRole('link', { name: /Etanol 96 %/ }).click();
  await expect(operator.getByRole('heading', { name: 'Etanol 96 %', level: 1 })).toBeVisible();
  expect(await operator.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectAccessible(operator, 'ficha móvil');
  await capture(operator, 'mobile-product');
  await operator.getByRole('button', { name: 'Salida' }).first().click();
  await expect(operator.getByRole('dialog', { name: 'Registrar salida' })).toBeVisible();
  await expectAccessible(operator, 'hoja móvil');
  await capture(operator, 'mobile-sheet', false);
});

test('en tableta (820 px), Inicio y la app conservan la barra lateral y usan listas sin desplazarse en horizontal', async ({ browser }) => {
  const admin = await signIn(browser, 'admin@demo.platlab.test', { width: 820, height: 1180 });
  await switchTo(admin, 'Laboratorio de Química');
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
  await switchTo(admin, 'Laboratorio de Química');
  // Volver a entrar abre el último espacio usado, sin pantalla para elegir (ADR 0011).
  await admin.goto('/');
  await expect(admin.getByRole('button', { name: 'Laboratorio de Química. Cambiar de espacio de trabajo' })).toBeVisible();
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
  await expect(admin).not.toHaveURL(/tipo=/);
  await expect(admin.getByRole('row').nth(1)).toBeVisible();
});

test('solicitudes de salida: aviso en el Resumen, rechazo con motivo y cancelación (ADR 0012)', async ({ browser }) => {
  const admin = await signIn(browser, 'admin@demo.platlab.test');
  await openReagents(admin, 'Laboratorio de Química');
  // La demo trae una solicitud pendiente del Operador: el Resumen la anuncia y abre la bandeja.
  await admin.getByRole('link', { name: /1 salida espera tu aprobación/ }).click();
  await expect(admin.getByRole('heading', { name: 'Solicitudes', level: 1 })).toBeVisible();
  const demo = admin.getByRole('article').filter({ hasText: 'Práctica de Análisis Químico' });
  await expect(demo).toContainText('NACL-2026-03-01');
  // En el móvil la bandeja se lee igual, sin desplazarse en horizontal.
  // Se recarga ya en el móvil: la fila de secciones trae la actual a la vista al montarse.
  await admin.setViewportSize({ width: 360, height: 780 });
  await admin.reload();
  await expect(demo.getByRole('button', { name: 'Aprobar salida' })).toBeVisible();
  await expect(admin.getByRole('navigation', { name: /en el móvil/ }).getByRole('link', { name: 'Solicitudes' })).toBeInViewport();
  expect(await admin.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectAccessible(admin, 'solicitudes móvil');
  await capture(admin, 'mobile-requests');
  await admin.setViewportSize({ width: 1440, height: 900 });
  await demo.getByRole('button', { name: 'Rechazar' }).click();
  // Rechazar exige motivo: sin él, se dice en el campo y no se envía.
  await demo.getByRole('button', { name: 'Rechazar solicitud' }).click();
  await expect(demo.getByText('Escribe por qué se rechaza: quien la pidió lo verá.')).toBeVisible();
  await demo.getByLabel('Motivo del rechazo').fill('La práctica se reprogramó para la próxima semana');
  await expectAccessible(admin, 'rechazo con motivo');
  await capture(admin, 'desktop-reject', false);
  await demo.getByRole('button', { name: 'Rechazar solicitud' }).click();
  await expect(admin.getByText('Solicitud rechazada')).toBeVisible();
  await expect(admin.getByText('No hay salidas por aprobar')).toBeVisible();
  await capture(admin, 'desktop-requests-empty', false);

  // El Operador pide otra salida, la cancela y ve el rechazo con su motivo.
  const operator = await signIn(browser, 'operador@demo.platlab.test');
  await openReagents(operator, 'Laboratorio de Química');
  await operator.getByRole('button', { name: 'Solicitar salida' }).click();
  const issue = operator.getByRole('dialog', { name: 'Solicitar salida' });
  await choose(operator, 'Frasco', /HCL-2026-01-01/);
  await issue.getByRole('button', { name: 'Todo el frasco' }).click();
  // El atajo escribe la cantidad sin separador de miles: más de 1.000 mL no se lee como decimal.
  await expect(issue.getByText(/^Quedarán/)).toHaveText(/^Quedarán 0\s*mL en el frasco\.$/);
  await pick(issue, 'Preparación de soluciones');
  await pick(issue, 'Laboratorio 2');
  await issue.getByRole('button', { name: 'Enviar solicitud' }).click();
  await expect(operator.getByText('Solicitud enviada')).toBeVisible();
  // Con todo el frasco apartado, su tarjeta lo dice y ya no ofrece «Salida»; el otro frasco, sí.
  await goTo(operator, 'Inventario');
  await operator.getByRole('link', { name: /Ácido clorhídrico/ }).click();
  const reservedFrasco = operator.getByRole('article').filter({ hasText: 'HCL-2026-01-01' });
  await expect(reservedFrasco.getByText(/apartados/)).toBeVisible();
  await expect(reservedFrasco.getByRole('button', { name: 'Salida' })).toHaveCount(0);
  await expect(operator.getByRole('article').filter({ hasText: 'HCL-2026-01-02' }).getByRole('button', { name: 'Salida' })).toBeVisible();
  await expectAccessible(operator, 'ficha con un frasco apartado');
  await capture(operator, 'desktop-product-reserved');
  await goTo(operator, 'Solicitudes');
  const pending = operator.getByRole('article').filter({ hasText: 'Preparación de soluciones' });
  await expect(pending).toContainText('HCL-2026-01-01');
  await expect(pending.getByRole('button', { name: 'Aprobar salida' })).toHaveCount(0);
  await pending.getByRole('button', { name: 'Cancelar solicitud' }).click();
  await expect(operator.getByText('Solicitud cancelada')).toBeVisible();
  await expect(operator.getByText('No tienes solicitudes pendientes')).toBeVisible();
  await operator.getByRole('link', { name: 'Todas', exact: true }).click();
  await expect(operator.getByRole('article').filter({ hasText: 'Preparación de soluciones' })).toContainText('Cancelada');
  const rejected = operator.getByRole('article').filter({ hasText: 'Práctica de Análisis Químico' });
  await expect(rejected).toContainText('Rechazada');
  await expect(rejected).toContainText('La práctica se reprogramó para la próxima semana');
  await expectAccessible(operator, 'solicitudes decididas');
  await capture(operator, 'desktop-requests-decided');
});

/**
 * Estados del paso 5 que antes solo se probaban por API. Stock insuficiente, sin permiso y sesión
 * expirada usan la API real; consulta y error simulan solo la respuesta, porque cambiar el estado
 * del módulo es del Equipo PlatLab y la decisión del servidor ya la prueba la integración.
 */
test('ficha con varios frascos: sin existencias, FEFO preseleccionado, aviso de vencido y ajuste (ADR 0012)', async ({ browser }) => {
  const admin = await signIn(browser, 'admin@demo.platlab.test');
  await openReagents(admin, 'Laboratorio de Química');
  await goTo(admin, 'Inventario');
  // Lo que no tiene saldo se oculta, pero no desaparece.
  await expect(admin.getByRole('link', { name: /Acetona/ })).toHaveCount(0);
  await admin.getByRole('button', { name: /Mostrar sin existencias/ }).click();
  await expect(admin.getByRole('link', { name: /Acetona/ })).toContainText('Sin existencias');
  await capture(admin, 'desktop-inventory-empty');

  await admin.getByRole('link', { name: /Ácido sulfúrico/ }).click();
  await expect(admin.getByRole('heading', { name: 'Ácido sulfúrico 98 %', level: 1 })).toBeVisible();
  await expect(admin.getByRole('article')).toHaveCount(3);
  await expect(admin.getByRole('article').filter({ hasText: 'H2SO4-2024-08-01' })).toContainText('Venció el');
  // Una sola primaria: «Registrar salida» de la cabecera; «Nuevo reactivo» no corresponde a la ficha.
  await expect(admin.getByRole('button', { name: 'Nuevo reactivo' })).toHaveCount(0);
  await expectAccessible(admin, 'ficha con varios frascos');
  await capture(admin, 'desktop-product-multi');

  // Desde la ficha, la salida llega con el frasco utilizable que vence antes (01 §6.1).
  await admin.getByRole('button', { name: 'Registrar salida' }).click();
  const issue = admin.getByRole('dialog', { name: 'Registrar salida' });
  await expect(issue.getByLabel('Frasco', { exact: true })).toContainText('H2SO4-2026-02-01');
  await choose(admin, 'Frasco', /H2SO4-2026-09-01/);
  await expect(issue.getByText('Vence antes:')).toContainText('H2SO4-2026-02-01');
  await capture(admin, 'desktop-fefo', false);
  await issue.getByRole('button', { name: 'Usar ese frasco' }).click();
  await expect(issue.getByLabel('Frasco', { exact: true })).toContainText('H2SO4-2026-02-01');
  // Un frasco vencido se puede usar, con advertencia.
  await choose(admin, 'Frasco', /H2SO4-2024-08-01/);
  await expect(issue.getByRole('alert')).toContainText('Este frasco venció el');
  await expectAccessible(admin, 'salida de un frasco vencido');
  await capture(admin, 'desktop-expired', false);
  await admin.keyboard.press('Escape');
  await expect(issue).toHaveCount(0);

  await admin.getByRole('article').filter({ hasText: 'H2SO4-2026-09-01' }).getByRole('button', { name: 'Ajustar' }).click();
  const adjustment = admin.getByRole('dialog', { name: 'Ajustar existencias' });
  await expect(adjustment.getByRole('radio', { name: 'Conteo mensual', exact: true })).toBeAttached();
  await expectAccessible(admin, 'hoja de ajuste');
  await capture(admin, 'desktop-adjust', false);
});

test('stock insuficiente: la salida se rechaza en el formulario y el saldo no cambia', async ({ browser }) => {
  const operator = await signIn(browser, 'operador@demo.platlab.test');
  await openReagents(operator, 'Laboratorio de Biología');
  await goTo(operator, 'Inventario');
  await operator.getByRole('link', { name: /Etanol 96 %/ }).click();
  const ethanol = operator.getByRole('article').filter({ hasText: 'ETOH-2026-01-01' });
  await expect(ethanol.getByText('500 mL', { exact: true }).first()).toBeVisible();

  await ethanol.getByRole('button', { name: 'Salida' }).click();
  const issue = operator.getByRole('dialog', { name: 'Registrar salida' });
  await issue.getByLabel('Cantidad', { exact: true }).fill('100000');
  // Antes de enviar ya se ve que no alcanza; el servidor lo confirma igual.
  await expect(issue.getByText('No alcanza: el frasco tiene 500 mL.')).toBeVisible();
  await pick(issue, 'Práctica de Química General');
  await pick(issue, 'Laboratorio 2');
  await issue.getByRole('button', { name: 'Registrar salida' }).click();
  await expect(issue.getByText('No alcanza: el frasco tiene 500 mL.')).toBeVisible();
  await expect(issue.getByLabel('Cantidad', { exact: true })).toHaveAttribute('aria-invalid', 'true');
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
  await admin.getByRole('link', { name: /Cloruro de sodio\b(?! MUR)/ }).first().click();
  await expect(admin.getByRole('heading', { name: 'Frascos' })).toBeVisible();
  for (const name of ['Registrar salida', 'Registrar ingreso', 'Ajustar', 'Nuevo reactivo', 'Salida', 'Ingresar frascos']) {
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
  await switchTo(admin, 'Laboratorio de Química');
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
  await expect(admin.getByRole('heading', { level: 1 })).toContainText('Ana');
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
