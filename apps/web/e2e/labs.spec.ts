import { expect, test, type Page } from '@playwright/test';
import { captureElement, expectAccessible, signIn } from './helpers';

/**
 * Recorrido de Laboratorios para G0 (ADR 0023, «G0 de Laboratorios») con las cuentas de la demo sintética
 * (supabase/seeds/demo.sql), todas en el espacio A: el Docente pide una práctica, la Administradora la aprueba y el
 * Operador la prepara, cierra la que está en curso y reporta una incidencia desde una práctica cerrada.
 *
 * Los pasos 4 y 5 usan SOL-0011 y SOL-0012, que solo existen tal como los deja la demo recién cargada: corre
 * `pnpm db:reset` antes (como en el CI). El paso 4 cierra SOL-0012 para siempre, así que no se repite sin recargar.
 */
const suffix = Date.now().toString(36).toUpperCase();
const title = `Prueba de laboratorio ${suffix}`;
const workspace = '/e/da000000-0000-4000-8000-00000000000a';
const labs = `${workspace}/laboratorios`;
const scale = `${workspace}/equipos/inventario/da920000-0000-4000-8000-000000000002`;
const zone = 'America/Guayaquil';

/** Hoy en la zona del espacio, AAAA-MM-DD. */
const todayText = () => new Intl.DateTimeFormat('en-CA', { timeZone: zone }).format(new Date());

/** Los días de martes a jueves entre 2 y 4 semanas desde hoy: el feriado de la demo es un viernes, dentro del período P1. */
function candidateDates(): string[] {
  const start = new Date(`${todayText()}T12:00:00Z`);
  const dates: string[] = [];
  for (let offset = 14; offset <= 28; offset += 1) {
    const day = new Date(start.getTime() + offset * 86_400_000);
    if ([2, 3, 4].includes(day.getUTCDay())) dates.push(day.toISOString().slice(0, 10));
  }
  return dates;
}

/** Un día y una hora de inicio (el área abre de 7 a 13) que cambian cada minuto, para que repetir la prueba no choque. */
function freeSlot() {
  const dates = candidateDates();
  const hours = ['07:00', '08:00', '09:00', '10:00', '11:00'];
  const index = Math.floor(Date.now() / 60_000) % (dates.length * hours.length);
  const start = hours[index % hours.length] ?? '07:00';
  return { date: dates[Math.floor(index / hours.length)] ?? '', start, end: `${String(Number(start.slice(0, 2)) + 2).padStart(2, '0')}:00` };
}

/** Del menú de Laboratorios a una solicitud recibida, por su título, tal como la abre quien atiende los laboratorios. */
async function openReceived(page: Page, requestTitle: string) {
  await page.goto(`${labs}/recibidas`);
  await page.getByRole('button', { name: /^Ver todas/ }).click();
  await page.getByRole('link', { name: requestTitle, exact: true }).click();
  await expect(page.getByRole('heading', { name: requestTitle, level: 1 })).toBeVisible();
}

test('solicitante, Administradora y responsable llevan una práctica de Laboratorios', async ({ browser }) => {
  const slot = freeSlot();
  expect(slot.date).not.toBe('');

  // 1. El Docente crea la solicitud en «Práctica académica» y la envía.
  const teacher = await signIn(browser, 'docente@demo.platlab.test');
  await teacher.waitForURL(/\/e\//);
  await teacher.goto(`${labs}/solicitudes`);
  await expect(teacher.getByRole('heading', { name: 'Mis solicitudes', level: 1 })).toBeVisible();
  await expectAccessible(teacher, 'Docente: Mis solicitudes');
  await teacher.getByRole('button', { name: /^Práctica académica/ }).click();
  await expect(teacher.getByRole('heading', { name: 'Práctica académica', level: 1 })).toBeVisible();

  await teacher.getByRole('textbox', { name: 'Título de la práctica' }).fill(title);
  await teacher.getByRole('combobox', { name: 'Tipo de actividad' }).click();
  await teacher.getByRole('option', { name: 'Práctica', exact: true }).click();
  await teacher.getByRole('combobox', { name: 'Asignatura' }).click();
  await teacher.getByRole('option', { name: 'Química General' }).click();
  await teacher.getByRole('combobox', { name: 'Carrera' }).click();
  await teacher.getByRole('option', { name: 'Bioquímica' }).click();
  await teacher.getByRole('combobox', { name: 'Área(opcional)' }).click();
  await teacher.getByRole('option', { name: /Laboratorio de Química/ }).click();
  await teacher.getByLabel('Fecha por agregar').fill(slot.date);
  await teacher.getByRole('button', { name: 'Agregar la fecha' }).click();
  await teacher.getByLabel('Hora de inicio').fill(slot.start);
  await teacher.getByLabel('Hora de fin').fill(slot.end);
  await teacher.getByRole('textbox', { name: 'Nº alumnos' }).fill('20');
  await teacher.getByRole('textbox', { name: 'Curso-paralelo' }).fill('A');
  await teacher.getByRole('button', { name: 'Agregar a Reactivos' }).click();
  await teacher.getByRole('button', { name: 'Reactivo del catálogo' }).click();
  await teacher.getByRole('option', { name: /Cloruro de sodio NACL/ }).click();
  await teacher.getByRole('textbox', { name: /Cantidad de Cloruro de sodio/ }).fill('5');
  await expectAccessible(teacher, 'Docente: solicitud por llenar');

  // «Antes de enviar» solo se abre si algo no alcanza o choca: con poca cantidad y un horario libre, se envía directo.
  await teacher.getByRole('button', { name: 'Enviar', exact: true }).click();
  await expect(teacher.getByText('Enviada', { exact: true }).first()).toBeVisible();
  await expect(teacher.getByRole('dialog', { name: 'Antes de enviar' })).toBeHidden();
  await expectAccessible(teacher, 'Docente: solicitud enviada');
  const code = (await teacher.getByText(/^SOL-\d{4}$/).first().textContent()) ?? '';
  expect(code).toMatch(/^SOL-\d{4}$/);

  // 2. La Administradora la ve en Recibidas y la aprueba.
  const admin = await signIn(browser, 'admin@demo.platlab.test');
  await admin.waitForURL(/\/e\//);
  await admin.goto(`${labs}/recibidas`);
  await expect(admin.getByRole('heading', { name: 'Recibidas', level: 1 })).toBeVisible();
  await expectAccessible(admin, 'Administradora: Recibidas');
  await admin.getByRole('link', { name: title, exact: true }).click();
  await expect(admin.getByRole('heading', { name: title, level: 1 })).toBeVisible();
  await expectAccessible(admin, 'Administradora: solicitud recibida');
  await admin.getByRole('button', { name: 'Aprobar', exact: true }).click();
  const held = admin.getByRole('region', { name: 'Lo apartado' });
  await expect(held).toBeVisible();
  await expect(admin.getByText('Programada', { exact: true }).first()).toBeVisible();
  await expect(held.getByText('Cloruro de sodio: apartado 5 de 5 g')).toBeVisible();
  await expectAccessible(admin, 'Administradora: solicitud programada');

  // 3. El Operador prepara el bloque: «Marcar lista» y «Iniciar», aún deshabilitado porque la fecha es futura.
  const operator = await signIn(browser, 'operador@demo.platlab.test');
  await operator.waitForURL(/\/e\//);
  await openReceived(operator, title);
  const block = operator.getByRole('region', { name: 'Lo apartado' });
  await expect(block.getByText('Programada', { exact: true })).toBeVisible();
  // La casilla cambia cuando el servidor confirma, no al hacer clic: se espera el resultado.
  const line = block.getByRole('checkbox', { name: /Cloruro de sodio/ });
  await line.click();
  await expect(line).toBeChecked();
  await expect(block.getByText('Todas las líneas están marcadas.')).toBeVisible();
  await block.getByRole('button', { name: 'Marcar lista' }).click();
  await expect(block.getByText('Lista', { exact: true })).toBeVisible();
  const start = block.getByRole('button', { name: 'Iniciar' });
  await expect(start).toBeDisabled();
  await expect(start).toHaveAccessibleDescription(/Se inicia desde el día de la práctica/);
  // El botón desaparece al cambiar la etapa: el foco pasa a la línea del bloque y no cae al body.
  await expect(block.locator('[id^="bloque-"]')).toBeFocused();
  await expectAccessible(operator, 'Operador: bloque listo');
  await captureElement(block, 'labs-bloque-acciones');

  // 4. SOL-0012 está en curso hoy: «Cerrar práctica» con observaciones (necesita la demo recién cargada).
  await openReceived(operator, 'Destilación simple');
  await expect(operator.getByText('En curso', { exact: true })).toBeVisible();
  await operator.getByRole('button', { name: 'Cerrar práctica' }).click();
  const sheet = operator.getByRole('dialog', { name: 'Cerrar práctica' });
  await expect(sheet).toBeVisible();
  await sheet.getByLabel('Observaciones').fill(`Sin novedades ${suffix}; el material quedó limpio.`);
  await expectAccessible(operator, 'Operador: Cerrar práctica');
  await captureElement(sheet, 'labs-cerrar-practica');
  await sheet.getByRole('button', { name: 'Cerrar práctica' }).click();
  await expect(sheet).toBeHidden();
  await expect(operator.getByText('Cerrada', { exact: true })).toBeVisible();
  // «Cerrar práctica» desaparece con la etapa: el foco pasa a la línea del bloque y no cae al body.
  await expect(operator.locator('[id^="bloque-"]').filter({ hasText: 'Cerrada' })).toBeFocused();
  await expect(operator.getByText('Finalizada', { exact: true }).first()).toBeVisible();
  await expect(operator.getByText(`Sin novedades ${suffix}; el material quedó limpio.`)).toBeVisible();
  await expectAccessible(operator, 'Operador: práctica cerrada');

  // El Cronograma de hoy marca la etapa de cada bloque con texto.
  await operator.goto(`${labs}/cronograma`);
  await expect(operator.getByRole('heading', { name: 'Cronograma', level: 1 })).toBeVisible();
  await expect(operator.getByRole('link', { name: /Etapa: Cerrada/ }).first()).toBeVisible();
  await expectAccessible(operator, 'Operador: Cronograma con etapas');
  await captureElement(operator.getByRole('main'), 'labs-cronograma-etapas');

  // 5. Desde SOL-0011 (cerrada), «Reportar incidencia» de su balanza; nace en Equipos con el vínculo a la práctica.
  await openReceived(operator, 'Medición de densidad');
  await operator.getByRole('button', { name: 'Reportar incidencia' }).click();
  const incident = operator.getByRole('dialog', { name: 'Reportar incidencia' });
  await expect(incident).toBeVisible();
  // Las opciones son píldoras: el radio es solo para lectores de pantalla, se pulsa su etiqueta.
  await incident.getByText('Mecánica', { exact: true }).click();
  await expect(incident.getByRole('radio', { name: 'Mecánica' })).toBeChecked();
  await incident.getByLabel('Qué le pasa').fill(`Plato desnivelado ${suffix}`);
  await incident.getByText('Sí', { exact: true }).click();
  await expect(incident.getByRole('radio', { name: 'Sí' })).toBeChecked();
  await expectAccessible(operator, 'Operador: Reportar incidencia');
  await incident.getByRole('button', { name: 'Reportar incidencia' }).click();
  await expect(incident).toBeHidden();

  await operator.goto(scale);
  await expect(operator.getByRole('heading', { name: 'Balanza analítica', level: 1 })).toBeVisible();
  const fault = operator.getByRole('listitem').filter({ hasText: `Plato desnivelado ${suffix}` });
  await fault.getByRole('button', { name: /^Ver incidente/ }).click();
  const faultSheet = operator.getByRole('dialog');
  await expect(faultSheet.getByText(/Reportado en la práctica P1-S\d+-QUI\d+/)).toBeVisible();
  await expectAccessible(operator, 'Operador: hoja del incidente');
  await operator.keyboard.press('Escape');
  await expect(faultSheet).toBeHidden();

  await operator.getByRole('tab', { name: 'Reservas' }).click();
  const bookings = operator.getByRole('tabpanel', { name: 'Reservas' });
  await expect(bookings).toBeVisible();
  // La balanza está apartada en SOL-0001 (la semana del código depende de la fecha de la demo).
  await expect(bookings.getByRole('listitem').first()).toContainText(/P1-S\d+-QUI\d+/);
  await expectAccessible(operator, 'Operador: pestaña Reservas');
  await captureElement(bookings, 'labs-reservas-equipo');
});
