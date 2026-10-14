import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';

/**
 * Recorrido visible de G0 (primer incremento, «Evidencia para cerrar G0», punto 1) con las cuentas
 * de la demo sintética (supabase/seeds/demo.sql). Cada persona usa su propio navegador.
 */
const password = 'platlab-demo';
const suffix = Date.now().toString(36).toUpperCase();
const product = { name: `Cloruro de sodio ${suffix}`, lot: `L-${suffix}` };
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

/**
 * Captura válida para la revisión: desde arriba, con el movimiento asentado y sin avisos encima.
 * Con `keepScroll`, donde la página dejó a la persona (p. ej., el frasco de una etiqueta QR).
 */
async function capture(page: Page, name: string, fullPage = true, keepScroll = false) {
  if (!keepScroll) await page.evaluate(() => window.scrollTo(0, 0));
  // Sin transiciones a medias: una captura tomada durante un fundido no es evidencia.
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== 'running'));
  // Los avisos se ocultan solo durante la foto: quitarlos del DOM rompería los siguientes.
  const hide = await page.addStyleTag({ content: '[data-sonner-toaster] { visibility: hidden !important; }' });
  await page.screenshot({ path: `${reviewDir}/${name}.png`, fullPage });
  await hide.evaluate((style) => style.remove());
}

/** WCAG 2.2 AA con axe en la pantalla tal como está (ADR 0010). */
async function expectAccessible(page: Page, label: string) {
  // Un color a mitad de una transición no es el estado de la pantalla: se espera a que termine.
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== 'running'));
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

/** El botón «⇄» de la tarjeta del frasco (ADR 0015) traslada. */
async function cardTransfer(card: Locator) {
  await card.getByRole('button', { name: /^Trasladar / }).click();
}

/** «Ajustar» vive en la cabecera de la ficha (ADR 0015, 14-10-2026): abre la ventana única y se elige el frasco del reactivo. */
async function adjustFrasco(page: Page, frasco: RegExp | string) {
  await page.getByRole('button', { name: 'Ajustar', exact: true }).click();
  await choose(page, 'Frasco', frasco);
}

/** Motivo o destino de la lista: se pulsa la etiqueta, como una persona, y queda marcado. */
async function pick(scope: Locator, name: string) {
  await scope.locator('label').filter({ hasText: new RegExp(`^${name}$`) }).click();
  await expect(scope.getByRole('radio', { name, exact: true })).toBeChecked();
}

/** Marca una casilla o un radio del panel: lo marcado viene de la URL, así que se espera a que se asiente. */
async function tick(control: Locator) {
  await control.click();
  await expect(control).toBeChecked();
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
  // Espacios de dos instituciones: el menú dice de cuál es cada uno (ADR 0011, 05-10-2026).
  await expect(admin.getByRole('menuitem', { name: /Facultad de Ciencias.*Universidad Demo/ })).toBeVisible();
  await expect(admin.getByRole('menuitem', { name: /Centro de Investigación.*Instituto Tecnológico Demo/ })).toBeVisible();
  await capture(admin, 'desktop-workspace-switcher', false);
  await admin.keyboard.press('Escape');
  await openReagents(admin, 'Facultad de Ciencias');
  // El rol depende del espacio: aquí es Administradora, no «Miembro».
  await expect(admin.getByRole('complementary').getByText('Administrador', { exact: true })).toBeVisible();
  await goTo(admin, 'Inventario');

  // «Nuevo reactivo» (ADR 0015): la Administradora crea el reactivo y su frasco en un paso, con todas las secciones a la vista.
  await admin.getByRole('button', { name: 'Nuevo reactivo' }).click();
  const ingress = admin.getByRole('dialog', { name: 'Nuevo reactivo' });
  for (const section of ['Datos de la etiqueta', 'Control por peso', 'Dónde se guarda', 'Clasificación y seguridad']) {
    await expect(ingress.getByRole('heading', { name: section })).toBeVisible();
  }
  await ingress.getByRole('combobox', { name: 'Nombre' }).fill(product.name);
  await ingress.getByRole('combobox', { name: 'Nombre' }).press('Tab');
  // El CAS con el dígito de control erróneo se avisa en un globo junto al campo, no entre los campos.
  await ingress.getByRole('textbox', { name: 'CAS' }).fill('7647-14-6');
  await ingress.getByRole('textbox', { name: 'Código' }).fill(`${product.lot}-01`);
  await ingress.getByRole('textbox', { name: 'Cantidad' }).fill('100');
  // La unidad es un desplegable unido a la cantidad; el segundo nivel de la ubicación espera al primero.
  await expect(ingress.getByRole('combobox', { name: 'Unidad' })).toHaveText('g');
  await expect(ingress.getByRole('combobox', { name: 'Estante o armario' })).toBeDisabled();
  await ingress.getByRole('combobox', { name: 'Ubicación' }).fill('Almacén');
  await admin.getByRole('option', { name: /Almacén de reactivos/ }).click();
  await expect(ingress.getByRole('combobox', { name: 'Estante o armario' })).toBeEnabled();
  await pick(ingress, 'Sólido');
  // El número de frascos va en el pie, unido al botón: [− N +] «Ingresar N frascos».
  await expect(ingress.getByRole('group', { name: 'Número de frascos' })).toBeVisible();
  await ingress.getByRole('button', { name: 'Un frasco más' }).click();
  await ingress.getByRole('button', { name: 'Ingresar 2 frascos' }).click();
  await expect(ingress.getByRole('alert').filter({ hasText: 'Revisa el CAS' })).toBeVisible();
  await expect(ingress.getByRole('textbox', { name: 'CAS' })).toHaveAttribute('aria-invalid', 'true');
  // Los globos ⓘ se abren con clic y se cierran con Esc sin cerrar la ventana.
  const weightTip = ingress.getByRole('button', { name: 'Cómo pesar el frasco' });
  await weightTip.click();
  await expect(weightTip).toHaveAttribute('aria-expanded', 'true');
  await expect(admin.getByRole('tooltip')).toContainText('frasco lleno y cerrado');
  await capture(admin, 'desktop-r01d-ingress-new-a', false);
  await admin.keyboard.press('Escape');
  await expect(weightTip).toHaveAttribute('aria-expanded', 'false');
  await ingress.getByRole('button', { name: 'Un frasco menos' }).click();
  await expect(ingress).toBeVisible();
  await ingress.getByRole('textbox', { name: 'CAS' }).fill('7647-14-5');
  await expect(ingress.getByRole('alert').filter({ hasText: 'Revisa el CAS' })).toHaveCount(0);
  await expect(ingress.getByRole('status').filter({ hasText: 'Listo: 1 frasco' })).toBeVisible();
  await expectAccessible(admin, 'ingresar reactivo');
  await capture(admin, 'desktop-sheet', false);
  await ingress.getByRole('button', { name: 'Ingresar 1 frasco' }).click();
  await expect(admin.getByText('Frasco ingresado')).toBeVisible();
  await expect(admin.getByText(`${product.name} · ${product.lot}-01`)).toBeVisible();

  // El Operador ingresa frascos pero no ajusta (ADR 0012); lo ve todo desde la ficha.
  const operator = await signIn(browser, 'operador@demo.platlab.test');
  await openReagents(operator, 'Facultad de Ciencias');
  await goTo(operator, 'Inventario');
  await expect(operator.getByRole('button', { name: 'Ajustar' })).toHaveCount(0);
  await expect(operator.getByRole('button', { name: 'Nuevo reactivo' })).toBeVisible();

  // Dos niveles: la tarjeta del reactivo abre su ficha con sus frascos.
  await operator.getByRole('link', { name: new RegExp(product.name) }).click();
  await expect(operator.getByRole('heading', { name: product.name, level: 1 })).toBeVisible();
  const productUrl = operator.url();
  const frasco = operator.getByRole('article').filter({ hasText: `${product.lot}-01` });
  await expect(frasco).toContainText(/100\s*g/);

  // ADR 0012: la salida del Operador es una solicitud que aparta la cantidad hasta que se aprueba.
  await frasco.getByRole('button', { name: 'Salida' }).click();
  const issue = operator.getByRole('dialog', { name: product.name });
  await issue.getByLabel('Cantidad a retirar', { exact: true }).fill('20');
  await expect(issue.getByText('Quedarán')).toContainText('80');
  // Un solo frasco con saldo: no hay nada que elegir, el selector no aparece.
  await expect(issue.getByLabel('Frasco', { exact: true })).toHaveCount(0);
  await pick(issue, 'Práctica de Química General');
  await pick(issue, 'Laboratorio de Química');
  await expectAccessible(operator, 'hoja de salida');
  await capture(operator, 'desktop-issue', false);
  await issue.getByRole('button', { name: 'Enviar solicitud' }).click();
  await expect(operator.getByText('Solicitud enviada')).toBeVisible();
  // El saldo no cambia hasta que se apruebe; lo pedido se ve apartado en el frasco.
  await expect(frasco).toContainText(/100\s*g/);
  await expect(frasco).toContainText(/Apartado\s*20\s*g/);
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
  await expect(frasco).toContainText(/80\s*g/);
  await expect(frasco).not.toContainText('Apartado');

  // La Administradora ajusta el frasco por conteo, con un motivo de la lista.
  await admin.goto(productUrl);
  const adminFrasco = admin.getByRole('article').filter({ hasText: `${product.lot}-01` });
  await adjustFrasco(admin, new RegExp(`${product.lot}-01`));
  const adjustment = admin.getByRole('dialog', { name: 'Ajustar existencias' });
  await adjustment.getByLabel('Diferencia').fill('0,5');
  await pick(adjustment, 'Conteo mensual');
  await adjustment.getByRole('button', { name: 'Registrar ajuste' }).click();
  await expect(admin.getByText('Quedan 79,5 g en el frasco')).toBeVisible();
  await expect(adminFrasco).toContainText(/79[.,]5\s*g/);
  await expectAccessible(admin, 'ficha del reactivo');
  await capture(admin, 'desktop-product');

  // Con un solo frasco con saldo, la hoja de salida no ofrece selector: el reactivo es el título.
  await admin.getByRole('button', { name: 'Registrar salida' }).click();
  const issueSheet = admin.getByRole('dialog', { name: product.name });
  await expect(issueSheet.getByLabel('Frasco', { exact: true })).toHaveCount(0);
  // Sin cantidad, «Confirmar salida» está deshabilitado.
  await expect(issueSheet.getByRole('button', { name: 'Confirmar salida' })).toBeDisabled();
  await admin.keyboard.press('Escape');
  await expect(issueSheet).toHaveCount(0);

  await goTo(admin, 'Inventario');
  await expectAccessible(admin, 'inventario');
  await capture(admin, 'desktop');

  await goTo(admin, 'Movimientos');
  const history = admin.getByRole('listitem').filter({ hasText: product.name });
  await expect(history).toHaveCount(3);
  await expect(history.nth(0)).toContainText('Ajuste');
  await expect(history.nth(0)).toContainText('Ana Administradora');
  await expect(history.nth(1)).toContainText('Salida');
  // Aprobada (ADR 0012): responsable la Administradora y, a continuación, quien la pidió.
  await expect(history.nth(1)).toContainText('Ana Administradora');
  await expect(history.nth(1)).toContainText('Pidió Óscar Operador');
  await expect(history.nth(2)).toContainText('Ingreso');
  // Los asientos se agrupan por día y cada fila abre la ficha del reactivo.
  await expect(admin.getByRole('heading', { name: /^Hoy/, level: 2 })).toBeVisible();
  await history.nth(0).getByRole('link').click();
  await expect(admin.getByRole('heading', { name: product.name, level: 1 })).toBeVisible();
  await goTo(admin, 'Movimientos');
  await expectAccessible(admin, 'movimientos');
  await capture(admin, 'desktop-movements');

  await admin.getByRole('link', { name: 'Inicio', exact: true }).click();
  await expect(admin.getByText(/reactivos? con existencias/)).toBeVisible();
  await expectAccessible(admin, 'inicio');
});

test('C sin Reactivos no lo ve; la propietaria opera como Administradora sin rol asignado', async ({ browser }) => {
  const admin = await signIn(browser, 'admin@demo.platlab.test');
  await switchTo(admin, 'Centro de Investigación');
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
  // ADR 0011, cambio del 05-10-2026: el espacio vive en la barra lateral; arriba, dónde se está.
  await expect(owner.getByRole('complementary')).toContainText('Facultad de Ciencias');
  await expect(owner.getByRole('complementary')).toContainText('Propietario');
  await owner.getByRole('link', { name: 'Abrir Reactivos' }).click();
  await expect(owner.getByRole('heading', { name: 'Reactivos', level: 1 })).toBeVisible();
  const topBar = owner.getByRole('banner');
  await expect(topBar).toContainText('Reactivos', { useInnerText: true });
  await expect(topBar).not.toContainText('Facultad de Ciencias', { useInnerText: true });
  // El Resumen ofrece las acciones rápidas; ingresar y ajustar también están en el Inventario.
  for (const name of ['Registrar salida', 'Nuevo reactivo']) {
    await expect(owner.getByRole('button', { name, exact: true })).toBeVisible();
  }
  await goTo(owner, 'Inventario');
  await expect(topBar).toContainText('Inventario', { useInnerText: true });
  for (const name of ['Nuevo reactivo', 'Ajustar']) {
    await expect(owner.getByRole('button', { name, exact: true })).toBeVisible();
  }
});

test('en el móvil, el Inicio y la app de Reactivos se adaptan desde 360 px', async ({ browser }) => {
  const operator = await signIn(browser, 'operador@demo.platlab.test', { width: 360, height: 780 });
  await switchTo(operator, 'Instituto de Biotecnología');
  await expect(operator.getByRole('link', { name: 'Abrir Reactivos' })).toBeVisible();
  await expect(operator.getByText('Instituto de Biotecnología').filter({ visible: true })).toBeVisible();
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
  // «Nuevo reactivo» en el móvil: una columna con todos los marcos y la tarjeta de seguridad al final.
  await operator.getByRole('button', { name: 'Nuevo reactivo', exact: true }).click();
  const mobileIngress = operator.getByRole('dialog', { name: 'Nuevo reactivo' });
  await expect(mobileIngress.getByRole('heading', { name: 'Clasificación y seguridad' })).toBeVisible();
  expect(await operator.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectAccessible(operator, 'nuevo reactivo móvil');
  await capture(operator, 'mobile-r01d-ingress', false);
  await operator.keyboard.press('Escape');
  await expect(mobileIngress).toHaveCount(0);
  await goTo(operator, 'Movimientos');
  await expect(operator.getByRole('listitem').filter({ hasText: 'Etanol 96 %' }).first()).toBeVisible();
  await capture(operator, 'mobile-movements');
  // La página nunca se desplaza en horizontal: si una tabla no cabe, se desplaza dentro de su panel.
  expect(await operator.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await goTo(operator, 'Inventario');

  // Segundo nivel en el móvil: la ficha con sus frascos, y la salida desde un frasco.
  await operator.getByRole('link', { name: /Etanol 96 %/ }).click();
  await expect(operator.getByRole('heading', { name: 'Etanol 96 %', level: 1 })).toBeVisible();
  // Frascos ya cargados: la captura es la ficha, no su esqueleto (que también pasa axe).
  await expect(operator.getByRole('article').first()).toBeVisible();
  expect(await operator.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectAccessible(operator, 'ficha móvil');
  await capture(operator, 'mobile-product');
  await capture(operator, 'mobile-r01d-product');
  await operator.getByRole('button', { name: 'Salida' }).first().click();
  await expect(operator.getByRole('dialog', { name: 'Etanol 96 %' })).toBeVisible();
  await expectAccessible(operator, 'hoja móvil');
  await capture(operator, 'mobile-sheet', false);
});

test('en tableta (820 px), Inicio y la app conservan la barra lateral y usan listas sin desplazarse en horizontal', async ({ browser }) => {
  const admin = await signIn(browser, 'admin@demo.platlab.test', { width: 820, height: 1180 });
  await switchTo(admin, 'Facultad de Ciencias');
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
  await switchTo(admin, 'Facultad de Ciencias');
  // Volver a entrar abre el último espacio usado, sin pantalla para elegir (ADR 0011).
  await admin.goto('/');
  await expect(admin.getByRole('button', { name: 'Facultad de Ciencias. Cambiar de espacio de trabajo' })).toBeVisible();
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
  await chart.hover({ position: { x: 20, y: 40 } });
  await expect(admin.getByText(/^\d+ salidas?$/)).toBeVisible();
  await admin.getByText('Ver los datos en tabla').click();
  await expect(admin.getByRole('table').getByRole('row')).toHaveCount(31);

  // El selector de módulos marca el actual; la cifra de salidas abre Movimientos.
  await admin.getByRole('button', { name: 'Reactivos. Cambiar de módulo' }).click();
  await expect(admin.getByRole('menuitem', { name: /Reactivos/ })).toBeVisible();
  await admin.keyboard.press('Escape');
  // El total de salidas va en la cabecera del gráfico (ADR 0012, 05-10-2026) y abre la lista.
  await admin.getByRole('link', { name: /\d+ salidas? en 30 días/ }).click();
  await expect(admin.getByRole('heading', { name: 'Movimientos', level: 1 })).toBeVisible();
  // La lista llega filtrada como la cifra: solo salidas de los últimos 30 días, marcadas en el panel y en las fichas.
  const filters = admin.getByRole('complementary', { name: 'Filtros' });
  await expect(filters.getByRole('checkbox', { name: /^Salidas/ })).toBeChecked();
  await expect(filters.getByRole('radio', { name: '30 días', exact: true })).toBeChecked();
  const active = admin.getByRole('list', { name: 'Filtros activos' });
  await expect(active.getByText('Tipo: Salidas')).toBeVisible();
  await expect(active.getByText('Últimos 30 días')).toBeVisible();
  const rows = admin.locator('main').getByRole('listitem').filter({ hasNot: admin.getByRole('button') });
  await expect(rows.first()).toBeVisible();
  for (const row of await rows.all()) await expect(row).toContainText('Salida');
  await expectAccessible(admin, 'movimientos filtrados');
  await capture(admin, 'desktop-movements-filtered', false);
  await admin.getByRole('button', { name: 'Limpiar' }).click();
  await expect(admin).not.toHaveURL(/tipo=|dias=/);
  await expect(admin.getByRole('list', { name: 'Filtros activos' })).toHaveCount(0);
  await expect(admin.locator('main').getByRole('listitem').first()).toBeVisible();

  // Vencidos abre el Inventario filtrado, y cada tarjeta dice sus avisos con texto (ADR 0012, 05-10-2026).
  await goTo(admin, 'Resumen');
  await admin.getByRole('link', { name: /^Vencidos/ }).click();
  await expect(admin).toHaveURL(/caducidad=vencidos/);
  await expect(admin.getByRole('button', { name: /Vencidos/, pressed: true })).toBeVisible();
  await expect(admin.getByRole('link', { name: /Ácido sulfúrico 98 %/ })).toContainText('1 vencido');
  await expectAccessible(admin, 'inventario filtrado por vencidos');
  await capture(admin, 'desktop-inventory-expired', false);
  await admin.getByRole('button', { name: /Vencidos/, pressed: true }).click();
  await expect(admin).not.toHaveURL(/caducidad=/);
});

test('solicitudes de salida: aviso en el Resumen, rechazo con motivo y cancelación (ADR 0012)', async ({ browser }) => {
  const admin = await signIn(browser, 'admin@demo.platlab.test');
  await openReagents(admin, 'Facultad de Ciencias');
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
  await openReagents(operator, 'Facultad de Ciencias');
  await operator.getByRole('button', { name: 'Solicitar salida' }).click();
  const issue = operator.getByRole('dialog');
  await choose(operator, 'Frasco', /HCL-2026-01-01/);
  await issue.getByRole('button', { name: 'Todo el frasco' }).click();
  // El atajo escribe la cantidad sin separador de miles: más de 1.000 mL no se lee como decimal.
  // Con tara (ADR 0015), además lo que marcará la balanza: solo el frasco vacío.
  await expect(issue.getByText(/^Quedarán/)).toHaveText(/^Quedarán:\s*0\s*mL$/);
  await expect(issue.getByText(/^En balanza/)).toHaveText('En balanza: 420,0 g');
  // El ácido clorhídrico es controlado: la cabecera lo marca con su ficha (ADR 0015).
  await expect(issue.getByText('Controlado', { exact: true })).toBeVisible();
  await pick(issue, 'Preparación de soluciones');
  await pick(issue, 'Laboratorio de Física');
  await issue.getByRole('button', { name: 'Enviar solicitud' }).click();
  await expect(operator.getByText('Solicitud enviada')).toBeVisible();
  // Con todo el frasco apartado, su tarjeta lo dice y ya no ofrece «Salida»; el otro frasco, sí.
  await goTo(operator, 'Inventario');
  await operator.getByRole('link', { name: /Ácido clorhídrico/ }).click();
  const reservedFrasco = operator.getByRole('article').filter({ hasText: 'HCL-2026-01-01' });
  await expect(reservedFrasco).toContainText('Apartado');
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
  await openReagents(admin, 'Facultad de Ciencias');
  await goTo(admin, 'Inventario');
  // Lo que no tiene saldo se oculta, pero no desaparece.
  await expect(admin.getByRole('link', { name: /Acetona/ })).toHaveCount(0);
  await admin.getByRole('button', { name: /Mostrar sin existencias/ }).click();
  await expect(admin.getByRole('link', { name: /Acetona/ })).toContainText('Sin existencias');
  await capture(admin, 'desktop-inventory-empty');

  await admin.getByRole('link', { name: /Ácido sulfúrico/ }).click();
  await expect(admin.getByRole('heading', { name: 'Ácido sulfúrico 98 %', level: 1 })).toBeVisible();
  await expect(admin.getByRole('article')).toHaveCount(3);
  // Cada frasco dice su estado con texto en su fila de estado (ADR 0015): el vencido y el FEFO, el que conviene
  // usar primero; la ficha de caducidad trae la fecha corta y, en su nube, cuánto hace.
  const expiredCard = admin.getByRole('article').filter({ hasText: 'H2SO4-2024-08-01' });
  const expiryChip = expiredCard.getByRole('button', { name: /^Caducidad \d{2}\/\d{2}\/\d{4}, vencido$/ });
  await expect(expiryChip).toHaveText(/^\d{2}\/\d{2}\/\d{4}$/);
  await expiryChip.hover();
  await expect(admin.getByRole('tooltip')).toContainText(/Venció el .+ · hace \d+ (días|meses|años)/);
  await admin.getByRole('heading', { name: 'Ácido sulfúrico 98 %', level: 1 }).hover();
  await expect(admin.getByRole('tooltip')).toHaveCount(0);
  // El código abre «Detalles del frasco»: ingreso y cantidad inicial (el lote es interno y no se muestra).
  await expiredCard.getByRole('button', { name: /^Detalles del frasco / }).hover();
  await expect(admin.getByRole('tooltip')).toContainText(/Ingresó.*Cantidad inicial/s);
  await admin.getByRole('heading', { name: 'Ácido sulfúrico 98 %', level: 1 }).hover();
  await expect(admin.getByRole('tooltip')).toHaveCount(0);
  await expect(admin.getByRole('article').filter({ hasText: 'H2SO4-2026-02-01' })).toContainText('Usar primero');
  await expect(admin.getByText('1 frasco vencido')).toBeVisible();
  // El saldo con su unidad y el % a la derecha.
  await expect(expiredCard).toContainText(/\d+ %/);
  await expect(expiredCard).toContainText('Vencido');
  await expect(admin.getByRole('complementary', { name: 'Resumen del reactivo' })).toContainText('Vencidos');
  // Una sola primaria: «Registrar salida» de la cabecera; en la ficha el ingreso es de ese reactivo.
  await expect(admin.getByRole('button', { name: 'Nuevo reactivo' })).toHaveCount(0);
  await expect(admin.getByRole('button', { name: 'Ingresar frascos' })).toBeVisible();
  await expectAccessible(admin, 'ficha con varios frascos');
  await capture(admin, 'desktop-product-multi');
  await capture(admin, 'desktop-r01d-product');

  // Desde la ficha, la salida llega con el frasco utilizable que vence antes (01 §6.1).
  await admin.getByRole('button', { name: 'Registrar salida' }).click();
  const issue = admin.getByRole('dialog');
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

  await adjustFrasco(admin, /H2SO4-2026-09-01/);
  const adjustment = admin.getByRole('dialog', { name: 'Ajustar existencias' });
  await expect(adjustment.getByRole('radio', { name: 'Conteo mensual', exact: true })).toBeAttached();
  await expectAccessible(admin, 'hoja de ajuste');
  await capture(admin, 'desktop-adjust', false);
});

test('mínimos: bajo mínimo en el Resumen y el Inventario, y el Administrador lo cambia desde la ficha (ADR 0012, 05-10-2026)', async ({ browser }) => {
  const admin = await signIn(browser, 'admin@demo.platlab.test');
  await openReagents(admin, 'Facultad de Ciencias');
  // «Bajo mínimo» reemplaza a «Reactivos» en el Resumen y abre el Inventario filtrado.
  await admin.getByRole('link', { name: /^Bajo mínimo/ }).click();
  await expect(admin).toHaveURL(/minimo=bajo/);
  await expect(admin.getByRole('button', { name: /Bajo mínimo/, pressed: true })).toBeVisible();
  await expect(admin.getByRole('link', { name: /Acetona/ })).toContainText('Bajo mínimo');
  await expect(admin.getByRole('link', { name: /Hidróxido de sodio/ })).toContainText('Bajo mínimo');
  await expect(admin.getByRole('link', { name: /Cloruro de sodio/ })).toHaveCount(0);
  await expectAccessible(admin, 'inventario bajo mínimo');
  await capture(admin, 'desktop-inventory-minimum', false);

  // El Administrador cambia el mínimo desde la ficha; por encima del nuevo, deja de estar bajo mínimo.
  await admin.getByRole('link', { name: /Hidróxido de sodio/ }).click();
  const header = admin.getByRole('complementary', { name: 'Resumen del reactivo' });
  await expect(header).toContainText('Bajo mínimo');
  await admin.getByRole('button', { name: 'Cambiar mínimo' }).click();
  const minimum = admin.getByRole('dialog', { name: 'Mínimo del reactivo' });
  await minimum.getByLabel('Mínimo', { exact: true }).fill('500');
  await expectAccessible(admin, 'hoja de mínimo');
  await minimum.getByRole('button', { name: 'Guardar mínimo' }).click();
  await expect(minimum).toHaveCount(0);
  await expect(header).toContainText(/Mínimo\s*500\s*g/);
  await expect(header).not.toContainText('Bajo mínimo');


  // Sin estado del lote (ADR 0012, 05-10-2026): un frasco vencido se desecha con un ajuste a cero y su motivo.
  await goTo(admin, 'Inventario');
  await admin.getByRole('link', { name: /Ácido sulfúrico/ }).click();
  const expired = admin.getByRole('article').filter({ hasText: 'H2SO4-2024-08-01' });
  await expect(expired.getByRole('button', { name: /Estado del lote/ })).toHaveCount(0);
  await adjustFrasco(admin, /H2SO4-2024-08-01/);
  const adjustment = admin.getByRole('dialog', { name: 'Ajustar existencias' });
  await expect(adjustment.getByRole('radio', { name: 'Vencido', exact: true })).toBeAttached();
  await expect(adjustment.getByRole('radio', { name: 'Contaminado', exact: true })).toBeAttached();
});

test('traslado: un frasco entero cambia de ubicación en un paso y Movimientos lo muestra (ADR 0012, entrega 4)', async ({ browser }) => {
  const admin = await signIn(browser, 'admin@demo.platlab.test');
  await openReagents(admin, 'Facultad de Ciencias');
  await goTo(admin, 'Inventario');
  await admin.getByRole('link', { name: /Ácido sulfúrico/ }).click();
  const card = admin.getByRole('article').filter({ hasText: 'H2SO4-2026-09-01' });
  await expect(card).toContainText('Almacén de reactivos');
  await cardTransfer(card);
  const sheet = admin.getByRole('dialog', { name: 'Trasladar frasco' });
  await expect(sheet).toContainText('H2SO4-2026-09-01');
  await choose(admin, 'Ubicación de destino', /Laboratorio de Química/);
  await expectAccessible(admin, 'hoja de traslado');
  await capture(admin, 'desktop-transfer', false);
  await sheet.getByRole('button', { name: 'Trasladar frasco' }).click();
  await expect(sheet).toHaveCount(0);
  await expect(card).toContainText('Laboratorio de Química');
  await expect(card).toContainText(/1\.000/);

  // Un asiento sale del origen y otro entra en el destino, con el tipo escrito.
  await goTo(admin, 'Movimientos');
  await tick(admin.getByRole('complementary', { name: 'Filtros' }).getByRole('checkbox', { name: /^Traslados/ }));
  await expect(admin).toHaveURL(/tipo=traslado/);
  const rows = admin.locator('main').getByRole('listitem').filter({ hasText: 'H2SO4-2026-09-01' });
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText('Traslado');
  await expectAccessible(admin, 'movimientos de traslado');
});

test('ingreso de un reactivo del catálogo, tara y ajuste por peso (ADR 0015)', async ({ browser }) => {
  const name = `Glucosa ${suffix}`;
  // La Administradora crea el reactivo con su frasco pesado: la tara se calcula al ingresar.
  const admin = await signIn(browser, 'admin@demo.platlab.test');
  await openReagents(admin, 'Facultad de Ciencias');
  await goTo(admin, 'Inventario');
  await admin.getByRole('button', { name: 'Nuevo reactivo' }).click();
  const ingress = admin.getByRole('dialog', { name: 'Nuevo reactivo' });
  await ingress.getByRole('combobox', { name: 'Nombre' }).fill(name);
  await ingress.getByRole('combobox', { name: 'Nombre' }).press('Tab');
  await ingress.getByRole('textbox', { name: 'CAS' }).fill('50-99-7');
  await ingress.getByRole('textbox', { name: 'Cantidad' }).fill('500');
  await ingress.getByLabel('Peso del frasco lleno (g)').fill('640');
  await expect(ingress.getByLabel('Tara (calculada, g)')).toHaveValue('140,0');
  await ingress.getByRole('combobox', { name: 'Ubicación' }).fill('Almacén');
  await admin.getByRole('option', { name: /Almacén de reactivos/ }).click();
  await pick(ingress, 'Sólido');
  await ingress.getByRole('button', { name: 'Ingresar 1 frasco' }).click();
  await expect(admin.getByText('Frasco ingresado')).toBeVisible();

  // El Operador elige el reactivo del catálogo: no puede crear uno nuevo, y sus datos no se editan.
  const operator = await signIn(browser, 'operador@demo.platlab.test');
  await openReagents(operator, 'Facultad de Ciencias');
  await goTo(operator, 'Inventario');
  await operator.getByRole('button', { name: 'Nuevo reactivo' }).click();
  const receipt = operator.getByRole('dialog', { name: 'Nuevo reactivo' });
  await receipt.getByRole('combobox', { name: 'Nombre' }).fill(name);
  await expect(operator.getByRole('option', { name: /^Crear/ })).toHaveCount(0);
  await operator.getByRole('option', { name: new RegExp(name) }).click();
  await expect(receipt.getByRole('textbox', { name: 'CAS' })).toHaveAttribute('readonly', '');
  // Con un reactivo del catálogo la unidad es la suya: texto fijo, sin desplegable.
  await expect(receipt.getByRole('combobox', { name: 'Unidad' })).toHaveCount(0);
  await receipt.getByRole('textbox', { name: 'Cantidad' }).fill('500');
  await receipt.getByRole('combobox', { name: 'Ubicación' }).fill('Almacén');
  await operator.getByRole('option', { name: /Almacén de reactivos/ }).click();
  await expectAccessible(operator, 'ingreso de un reactivo del catálogo');
  await receipt.getByRole('button', { name: 'Ingresar 1 frasco' }).click();
  await expect(operator.getByText('Frasco ingresado')).toBeVisible();

  // En la ficha, el frasco pesado muestra su tara; «Por peso» registra el saldo que marca la balanza.
  await goTo(admin, 'Inventario');
  await admin.getByRole('link', { name: new RegExp(name) }).click();
  // Desde la ficha, «Ingresar frascos» trae su reactivo ya elegido, con los datos del catálogo.
  await admin.getByRole('button', { name: 'Ingresar frascos' }).click();
  const more = admin.getByRole('dialog', { name: 'Ingresar frascos' });
  await expect(more.getByRole('combobox', { name: 'Nombre' })).toHaveValue(name);
  await expect(more.getByRole('textbox', { name: 'CAS' })).toHaveValue('50-99-7');
  await expect(more.getByRole('textbox', { name: 'CAS' })).toHaveAttribute('readonly', '');
  await expect(more.getByRole('textbox', { name: 'Cantidad' })).toBeFocused();
  await admin.keyboard.press('Escape');
  await expect(more).toHaveCount(0);
  // Con tara, la tarjeta trae la ficha ⚖ con el peso que debe marcar la balanza; su nube dice cómo comprobarlo.
  const scaleChip = admin.getByRole('button', { name: /^Debe pesar/ });
  const weighed = admin.getByRole('article').filter({ has: scaleChip });
  await expect(weighed).toHaveCount(1);
  await expect(scaleChip).toHaveText('Debe pesar 640 g');
  await scaleChip.hover();
  const scaleTip = admin.getByRole('dialog', { name: /^Debe pesar/ });
  await expect(scaleTip).toContainText('Pon el frasco cerrado en la balanza: debería marcar 640 g');
  // «Corregir con la balanza» abre Ajustar en modo balanza para ese frasco.
  await scaleTip.getByRole('button', { name: 'Corregir con la balanza' }).click();
  const adjustment = admin.getByRole('dialog', { name: 'Ajustar existencias' });
  await adjustment.getByLabel('¿Qué marca la balanza? (g)').fill('600');
  await expect(adjustment.getByText('Quedará')).toContainText('460');
  await expectAccessible(admin, 'ajuste por peso');
  await adjustment.getByRole('button', { name: 'Registrar ajuste' }).click();
  await expect(admin.getByText('Quedan 460 g en el frasco')).toBeVisible();

  // El frasco sin tara activa la balanza desde la misma ventana de Ajustar.
  // El que no tiene tara conserva sus 500 g; el pesado quedó en 460 g.
  await adjustFrasco(admin, /500\s*g/);
  const activate = admin.getByRole('dialog', { name: 'Ajustar existencias' });
  await activate.getByRole('button', { name: 'Pesar el frasco para activar la balanza' }).click();
  await activate.getByLabel('Peso del frasco ahora (g)').fill('650');
  await expect(activate.getByText('Tara calculada')).toContainText('150,0 g');
  await activate.getByRole('button', { name: 'Activar la balanza' }).click();
  await expect(admin.getByText('Balanza activada')).toBeVisible();
  await expect(admin.getByRole('button', { name: /^Debe pesar/ })).toHaveCount(2);
});

test('etiquetas con giro: las tarjetas giran a su etiqueta, se elige una y se imprime solo esa (ADR 0010)', async ({ browser }) => {
  const admin = await signIn(browser, 'admin@demo.platlab.test');
  await openReagents(admin, 'Facultad de Ciencias');
  await goTo(admin, 'Inventario');
  await admin.getByRole('link', { name: /Ácido sulfúrico/ }).click();
  const cards = admin.getByRole('article');
  const target = cards.filter({ hasText: 'H2SO4-2026-02-01' });
  const containerId = (await target.getAttribute('id'))?.replace('frasco-', '');
  expect(containerId).toBeTruthy();

  const toggle = admin.getByRole('button', { name: 'Etiquetas QR' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  // Al girar, cada tarjeta es una casilla con su etiqueta; ninguna elegida.
  const boxes = admin.getByRole('checkbox');
  await expect(boxes).toHaveCount(3);
  const bar = admin.getByRole('region', { name: 'Elegir etiquetas' });
  await expect(bar).toContainText('0 elegidas');
  await expect(bar.getByRole('button', { name: 'Imprimir 0' })).toBeDisabled();
  // La tarjeta entera es la casilla: con el teclado, Espacio la elige.
  const box = boxes.filter({ has: admin.getByRole('img', { name: 'Código QR del frasco H2SO4-2026-02-01' }) });
  await box.focus();
  await admin.keyboard.press('Space');
  await expect(box).toHaveAttribute('aria-checked', 'true');
  await expect(box).toContainText('Se imprime');
  await expect(bar).toContainText('1 elegida');
  await expectAccessible(admin, 'ficha con las etiquetas giradas');
  await capture(admin, 'desktop-r01d-labels-flip', false);

  // Esc devuelve las tarjetas al frente.
  await admin.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(boxes).toHaveCount(0);
  await expect(admin.getByRole('button', { name: 'Salida' }).first()).toBeVisible();

  // De nuevo en el modo, elegir una e imprimir lleva a la hoja con esa preselección.
  await toggle.click();
  await expect(bar).toContainText('0 elegidas');
  await box.click();
  await bar.getByRole('button', { name: 'Imprimir 1' }).click();
  await expect(admin).toHaveURL(new RegExp(`/etiquetas\\?frascos=${containerId}$`));
  await expect(admin.getByText('1 etiqueta elegida de 3')).toBeVisible();
});

test('etiquetas con QR: se eligen e imprimen, y el enlace del QR abre el frasco aun sin sesión (ADR 0012, entrega 4)', async ({ browser }) => {
  const admin = await signIn(browser, 'admin@demo.platlab.test');
  await openReagents(admin, 'Facultad de Ciencias');
  await goTo(admin, 'Inventario');
  await admin.getByRole('link', { name: /Ácido sulfúrico/ }).click();
  const target = admin.getByRole('article').filter({ hasText: 'H2SO4-2026-02-01' });
  const containerId = (await target.getAttribute('id'))?.replace('frasco-', '');
  expect(containerId).toBeTruthy();

  // «Etiquetas QR» (cabecera) gira las tarjetas; «Todas» y «Imprimir 3» llevan a la hoja con las tres elegidas.
  await admin.getByRole('button', { name: 'Etiquetas QR' }).click();
  await admin.getByRole('button', { name: 'Todas' }).click();
  await admin.getByRole('button', { name: 'Imprimir 3' }).click();
  await expect(admin).toHaveURL(/\/etiquetas\?frascos=/);
  const labels = admin.getByRole('list', { name: 'Etiquetas' });
  const qr = labels.getByRole('img', { name: 'Código QR del frasco H2SO4-2026-02-01' });
  await expect(qr).toBeVisible();
  // El QR codifica un enlace corto, para que sus módulos se lean impresos en 22 mm.
  const qrUrl = (await qr.getAttribute('data-value')) ?? '';
  expect(qrUrl).toMatch(/\/q\/[A-Za-z0-9_-]{43}$/);
  await expect(labels).not.toContainText('Lote');
  await expect(admin.getByText('3 etiquetas elegidas de 3')).toBeVisible();
  await labels.getByRole('checkbox', { name: 'H2SO4-2024-08-01' }).uncheck();
  await expect(admin.getByText('2 etiquetas elegidas de 3')).toBeVisible();
  // En la página de etiquetas no hay acciones de registro: la tarea es imprimir.
  await expect(admin.getByRole('button', { name: 'Registrar salida' })).toHaveCount(0);
  await expectAccessible(admin, 'etiquetas');
  await capture(admin, 'desktop-labels', false);
  // Vista de impresión: solo las elegidas, sin menú, barra ni casillas.
  await admin.emulateMedia({ media: 'print' });
  await expect(labels.getByRole('checkbox')).toHaveCount(0);
  await expect(admin.getByRole('navigation').first()).toBeHidden();
  await capture(admin, 'labels-print');
  await admin.emulateMedia({ media: 'screen' });

  // El enlace del QR, sin sesión, pasa por el acceso, vuelve, resuelve el frasco y la ficha lo resalta.
  const url = new URL(qrUrl).pathname;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-EC', timezoneId: 'America/Guayaquil' });
  const phone = await context.newPage();
  await phone.goto(url);
  await expect(phone).toHaveURL(/\/acceso/);
  await phone.getByLabel('Correo').fill('admin@demo.platlab.test');
  await phone.getByLabel('Contraseña').fill(password);
  await phone.getByRole('button', { name: 'Entrar' }).click();
  await expect(phone).toHaveURL(new RegExp(`/frascos/${containerId}$`));
  // Escanear abre la descarga de ese frasco, ya elegido.
  const issue = phone.getByRole('dialog');
  await expect(issue).toBeVisible();
  await expect(issue.getByLabel('Frasco', { exact: true })).toContainText('H2SO4-2026-02-01');
  await expectAccessible(phone, 'descarga desde su etiqueta');
  await capture(phone, 'mobile-scanned', false, true);
  // Al cerrarla, la ficha deja el frasco resaltado y a la vista.
  await phone.keyboard.press('Escape');
  const scanned = phone.locator('article[aria-current="true"]');
  await expect(scanned).toContainText('Desde su etiqueta');
  await expect(scanned).toBeInViewport();

  // Para el Operador, la descarga escaneada es una solicitud, con la aprobación de siempre.
  const operator = await signIn(browser, 'operador@demo.platlab.test', { width: 390, height: 844 });
  await expect(operator).toHaveURL(/\/e\//);
  await operator.goto(url);
  await expect(operator.getByRole('dialog')).toBeVisible();
  await expect(operator.getByRole('dialog').getByLabel('Frasco', { exact: true })).toContainText('H2SO4-2026-02-01');
});

test('stock insuficiente: la salida se rechaza en el formulario y el saldo no cambia', async ({ browser }) => {
  const operator = await signIn(browser, 'operador@demo.platlab.test');
  await openReagents(operator, 'Instituto de Biotecnología');
  await goTo(operator, 'Inventario');
  await operator.getByRole('link', { name: /Etanol 96 %/ }).click();
  const ethanol = operator.getByRole('article').filter({ hasText: 'ETOH-2026-01-01' });
  await expect(ethanol).toContainText(/500\s*mL/);

  await ethanol.getByRole('button', { name: 'Salida' }).click();
  const issue = operator.getByRole('dialog');
  await issue.getByLabel('Cantidad a retirar', { exact: true }).fill('100000');
  // Antes de enviar ya se ve que no alcanza; el servidor lo confirma igual.
  await expect(issue.getByText('No alcanza: el frasco tiene 500 mL.')).toBeVisible();
  await pick(issue, 'Práctica de Química General');
  await pick(issue, 'Laboratorio de Física');
  await issue.getByRole('button', { name: 'Confirmar salida' }).click();
  await expect(issue.getByText('No alcanza: el frasco tiene 500 mL.')).toBeVisible();
  await expect(issue.getByLabel('Cantidad a retirar', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expectAccessible(operator, 'hoja con stock insuficiente');
  await capture(operator, 'desktop-insufficient', false);

  await operator.keyboard.press('Escape');
  await expect(issue).toHaveCount(0);
  await operator.reload();
  await expect(ethanol).toContainText(/500\s*mL/);
});

test('listas de la hoja de salida: la Administradora quita un destino con la papelera y lo deshace; el Operador no ve papeleras', async ({ browser }) => {
  const admin = await signIn(browser, 'admin@demo.platlab.test');
  await openReagents(admin, 'Facultad de Ciencias');
  await admin.getByRole('button', { name: 'Registrar salida' }).click();
  const issue = admin.getByRole('dialog');
  const destinations = issue.getByRole('group', { name: 'Destino' });
  // Se agrega un destino propio para no tocar los del resto de pruebas.
  await destinations.getByRole('button', { name: 'Agregar' }).click();
  await destinations.getByLabel('Nuevo destino').fill('Aula de prueba');
  await destinations.getByRole('button', { name: 'Guardar' }).click();
  await expect(destinations.getByRole('radio', { name: 'Aula de prueba', exact: true })).toBeChecked();
  await expect(destinations.getByRole('button', { name: /^Quitar «/ }).first()).toBeVisible();

  // Un clic en la papelera archiva el destino, lo deselecciona y avisa con «Deshacer».
  await destinations.getByRole('button', { name: 'Quitar «Aula de prueba»' }).click();
  await expect(admin.getByText('Se quitó «Aula de prueba»')).toBeVisible();
  await expect(destinations.getByRole('radio', { name: 'Aula de prueba', exact: true })).toHaveCount(0);
  await expectAccessible(admin, 'hoja de salida tras quitar un destino');

  await admin.getByRole('button', { name: 'Deshacer' }).click();
  await expect(destinations.getByRole('radio', { name: 'Aula de prueba', exact: true })).toBeAttached();
  await expect(destinations.getByRole('radio', { name: 'Aula de prueba', exact: true })).toBeChecked();

  // El Operador elige de las listas, pero no las modifica.
  const operator = await signIn(browser, 'operador@demo.platlab.test');
  await openReagents(operator, 'Facultad de Ciencias');
  await operator.getByRole('button', { name: 'Solicitar salida' }).click();
  const request = operator.getByRole('dialog');
  await expect(request.getByRole('group', { name: 'Destino' }).getByRole('radio').first()).toBeAttached();
  await expect(request.getByRole('button', { name: /^Quitar «/ })).toHaveCount(0);
  await expect(request.getByRole('button', { name: 'Agregar' })).toHaveCount(0);
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
  await openReagents(admin, 'Facultad de Ciencias');
  await expect(admin.getByRole('status').filter({ hasText: 'Reactivos está en modo consulta' })).toBeVisible();
  await goTo(admin, 'Inventario');
  await admin.getByRole('link', { name: /Cloruro de sodio\b(?! MUR)/ }).first().click();
  await expect(admin.getByRole('heading', { name: 'Frascos' })).toBeVisible();
  for (const name of ['Registrar salida', 'Nuevo reactivo', 'Ajustar', 'Salida', 'Ingresar frascos']) {
    await expect(admin.getByRole('button', { name, exact: true })).toHaveCount(0);
  }
  await goTo(admin, 'Movimientos');
  await expect(admin.getByRole('listitem').first()).toBeVisible();
  await expectAccessible(admin, 'modo consulta');
  await capture(admin, 'desktop-read-only');
});

test('error: un fallo del servidor muestra «Reintentar» y al reintentar se recupera', async ({ browser }) => {
  const admin = await signIn(browser, 'admin@demo.platlab.test');
  await admin.route('**/v1/workspaces/*/reagents/positions*', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, status: 500, json: { error: { code: 'INTERNAL', message: 'Fallo simulado' } } });
  });
  await switchTo(admin, 'Facultad de Ciencias');
  await admin.getByRole('link', { name: 'Abrir Reactivos' }).click();
  await expect(admin.getByText('No pudimos cargar esta información')).toBeVisible();
  await expectAccessible(admin, 'error');

  await admin.unroute('**/v1/workspaces/*/reagents/positions*');
  await admin.getByRole('button', { name: 'Reintentar' }).click();
  await expect(admin.getByRole('heading', { name: 'Reactivos', level: 1 })).toBeVisible();
  await expect(admin.getByText('No pudimos cargar esta información')).toHaveCount(0);

  // Carga: con la respuesta retenida, el esqueleto se anuncia como estado y pasa axe.
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => (release = resolve));
  await admin.route('**/v1/workspaces/*/reagents/issue-requests*', async (route) => {
    await held;
    await route.continue();
  });
  await goTo(admin, 'Solicitudes');
  await expect(admin.getByRole('status', { name: 'Cargando' })).toBeVisible();
  await expectAccessible(admin, 'carga');
  release();
  await expect(admin.getByRole('status', { name: 'Cargando' })).toHaveCount(0);
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

test('Movimientos como informe: el panel filtra por la URL, las fichas quitan y Totales abre Detalle (R-01C)', async ({ browser }) => {
  const admin = await signIn(browser, 'admin@demo.platlab.test');
  await openReagents(admin, 'Facultad de Ciencias');
  await goTo(admin, 'Movimientos');
  const panel = admin.getByRole('complementary', { name: 'Filtros' });
  await expect(panel).toBeVisible();
  await expect(admin.getByText(/^\d+ movimientos?$/).first()).toBeVisible();
  await capture(admin, 'desktop-movements-panel', false);

  // Marcar «Salidas» aplica al instante: cambia la URL, la ficha y la lista.
  await tick(panel.getByRole('checkbox', { name: /^Salidas/ }));
  await expect(admin).toHaveURL(/tipo=salida/);
  const chips = admin.getByRole('list', { name: 'Filtros activos' });
  await expect(chips.getByText('Tipo: Salidas', { exact: true })).toBeVisible();
  // El orden de Tipo es fijo: marcar no mueve las filas.
  await expect(panel.getByRole('group', { name: /^Tipo/ }).getByRole('checkbox').first()).toHaveAccessibleName(/^Ingresos/);
  const ledger = admin.locator('main').getByRole('listitem').filter({ has: admin.getByRole('link') });
  await expect(ledger.first()).toBeVisible();
  for (const row of await ledger.all()) await expect(row).toContainText('Salida');
  await tick(panel.getByRole('checkbox', { name: /^Ajustes/ }));
  await expect(chips.getByText('Tipo: Salidas y Ajustes')).toBeVisible();
  await tick(panel.getByRole('radio', { name: 'Este mes' }));
  await expect(admin).toHaveURL(/periodo=mes/);
  await expect(chips.getByText('Este mes', { exact: true })).toBeVisible();

  // Desde–hasta: si la fecha inicial es mayor, el aviso queda en el campo y no se aplica.
  await tick(panel.getByRole('radio', { name: 'Desde–hasta' }));
  await panel.getByLabel('Desde', { exact: true }).fill('2026-03-15');
  await panel.getByLabel('Hasta', { exact: true }).fill('2026-03-01');
  await expect(panel.getByText('La fecha inicial es posterior a la final.')).toBeVisible();
  await expect(admin).not.toHaveURL(/hasta=2026-03-01/);
  await panel.getByLabel('Hasta', { exact: true }).fill('2026-03-20');
  await expect(admin).toHaveURL(/desde=2026-03-15&hasta=2026-03-20/);
  await expect(chips.getByText('15–20 mar', { exact: true })).toBeVisible();
  await expectAccessible(admin, 'movimientos con panel');

  // La × de la ficha quita ese grupo; «Limpiar» vuelve a Todo.
  await chips.getByRole('button', { name: 'Quitar filtro de periodo' }).click();
  await expect(admin).not.toHaveURL(/desde=|periodo=/);
  await chips.getByRole('button', { name: 'Quitar filtro de tipo' }).click();
  await expect(admin).not.toHaveURL(/tipo=/);
  await expect(chips).toHaveCount(0);

  // El panel se pliega y el navegador lo recuerda.
  await admin.getByRole('button', { name: 'Ocultar filtros' }).click();
  await expect(panel).toHaveCount(0);
  await admin.reload();
  await expect(admin.getByRole('button', { name: 'Filtros', exact: true })).toBeVisible();
  await expect(panel).toHaveCount(0);
  await admin.getByRole('button', { name: 'Filtros', exact: true }).click();
  await expect(panel).toBeVisible();

  // Totales: cifras por reactivo; cada fila abre Detalle con ese reactivo.
  await admin.getByRole('button', { name: 'Totales', exact: true }).click();
  await expect(admin).toHaveURL(/vista=totales/);
  const table = admin.getByRole('table');
  await expect(table).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Neto' })).toBeVisible();
  await expectAccessible(admin, 'movimientos totales');
  await capture(admin, 'desktop-movements-totals', false);
  await admin.getByLabel('Agrupar por').click();
  await admin.getByRole('option', { name: 'Responsable' }).click();
  await expect(admin).toHaveURL(/agrupar=responsable/);
  await expect(admin.getByRole('heading', { name: 'Ana Administradora', level: 2 })).toBeVisible();
  await admin.getByLabel('Agrupar por').click();
  await admin.getByRole('option', { name: 'Reactivo' }).click();
  await table.getByRole('link').first().click();
  await expect(admin).toHaveURL(/reactivo=/);
  await expect(admin).not.toHaveURL(/vista=/);
  await expect(admin.getByRole('list', { name: 'Filtros activos' }).getByText(/^Reactivo: /)).toBeVisible();
  await expect(admin.getByRole('button', { name: 'Detalle', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('Movimientos: quien no tiene reportes no ve Totales (R-01C)', async ({ browser }) => {
  const operator = await signIn(browser, 'operador@demo.platlab.test');
  await openReagents(operator, 'Facultad de Ciencias');
  await goTo(operator, 'Movimientos');
  await expect(operator.getByRole('complementary', { name: 'Filtros' })).toBeVisible();
  await expect(operator.getByRole('button', { name: 'Totales', exact: true })).toHaveCount(0);
  // Un enlace con vista=totales cae en Detalle.
  await operator.goto(`${operator.url().split('?')[0]}?vista=totales`);
  await expect(operator.getByRole('button', { name: 'Totales', exact: true })).toHaveCount(0);
  await expect(operator.locator('main').getByRole('listitem').first()).toBeVisible();
});

test('Movimientos en el móvil: el cajón de filtros abre, se cierra con Esc y devuelve el foco (R-01C)', async ({ browser }) => {
  const admin = await signIn(browser, 'admin@demo.platlab.test', { width: 390, height: 844 });
  await openReagents(admin, 'Facultad de Ciencias');
  await goTo(admin, 'Movimientos');
  await expect(admin.getByRole('complementary', { name: 'Filtros' })).toHaveCount(0);
  const trigger = admin.getByRole('button', { name: 'Filtros', exact: true });
  await trigger.click();
  const drawer = admin.getByRole('dialog', { name: 'Filtros' });
  await expect(drawer).toBeVisible();
  // Áreas táctiles de 44 px reales (la raíz del módulo es de 15 px).
  for (const target of [drawer.getByRole('button', { name: 'Cerrar' }), drawer.getByRole('checkbox', { name: /^Salidas/ }), drawer.getByRole('button', { name: /^Periodo/ })]) {
    expect((await target.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  }
  await tick(drawer.getByRole('checkbox', { name: /^Salidas/ }));
  await expect(admin).toHaveURL(/tipo=salida/);
  await admin.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== 'running'));
  await expectAccessible(admin, 'cajón de filtros');
  await capture(admin, 'mobile-movements-drawer', false);
  await admin.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
  await expect(admin.getByRole('button', { name: 'Filtros (1)' })).toBeFocused();

  // La ficha abre el cajón en su grupo; «Ver N movimientos» lo cierra.
  await admin.getByRole('button', { name: 'Tipo: Salidas', exact: true }).click();
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('button', { name: /^Tipo/ })).toBeFocused();
  await drawer.getByRole('button', { name: /^Ver \d+ movimientos?$/ }).click();
  await expect(drawer).toHaveCount(0);
  await expect(admin.getByRole('list', { name: 'Filtros activos' })).toBeVisible();
  expect(await admin.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectAccessible(admin, 'movimientos móvil');
  await capture(admin, 'mobile-movements-filtered', false);

  await admin.getByRole('button', { name: 'Totales', exact: true }).click();
  await expect(admin.getByRole('list').filter({ hasText: 'Movimientos' }).first()).toBeVisible();
  expect(await admin.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectAccessible(admin, 'totales móvil');
  await capture(admin, 'mobile-movements-totals', false);
});

test('Movimientos a 1280 px: el panel comparte la fila con la lista y Totales cabe (R-01C)', async ({ browser }) => {
  const admin = await signIn(browser, 'admin@demo.platlab.test', { width: 1280, height: 720 });
  await openReagents(admin, 'Facultad de Ciencias');
  await goTo(admin, 'Movimientos');
  await expect(admin.getByRole('complementary', { name: 'Filtros' })).toBeVisible();
  await tick(admin.getByRole('complementary', { name: 'Filtros' }).getByRole('checkbox', { name: /^Salidas/ }));
  await expect(admin.locator('main').getByRole('listitem').first()).toBeVisible();
  expect(await admin.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectAccessible(admin, 'movimientos 1280');
  await capture(admin, 'desktop-1280-movements-panel', false);
  await admin.getByRole('button', { name: 'Totales', exact: true }).click();
  await expect(admin.getByRole('table')).toBeVisible();
  await capture(admin, 'desktop-1280-movements-totals', false);
});
