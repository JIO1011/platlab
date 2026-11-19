import { expect, test } from '@playwright/test';
import { expectAccessible, signIn } from './helpers';

/**
 * Usuarios (ADR 0027) con la demo sintética (supabase/seeds/demo.sql), espacio A: la Propietaria ve quién no entra
 * hace más de un mes, agrega un correo a la lista blanca y quita el acceso; la Estudiante invitada se une con «Unirme».
 *
 * La Estudiante solo está pendiente tal como la deja la demo recién cargada: corre `pnpm db:reset` antes (como en el
 * CI). Unirse consume su invitación, así que el recorrido no se repite sin recargar.
 */
const workspace = '/e/da000000-0000-4000-8000-00000000000a';
const users = `${workspace}/usuarios`;
const suffix = Date.now().toString(36);

test.describe.configure({ mode: 'serial' });

test('la Propietaria ve la actividad y agrega a alguien a la lista', async ({ browser }) => {
  const page = await signIn(browser, 'propietaria@demo.platlab.test');
  await page.getByRole('link', { name: 'Usuarios' }).first().click();
  await expect(page).toHaveURL(users);
  await expect(page.getByRole('heading', { name: 'Usuarios', level: 1 })).toBeVisible();

  await page.getByRole('button', { name: /^Sin actividad/ }).click();
  const list = page.getByRole('region', { name: 'Sin actividad' });
  await expect(list.getByText('Diego Docente')).toBeVisible();
  await expect(list.getByText('Entró hace 45 días')).toBeVisible();
  await expectAccessible(page, 'Usuarios, sin actividad');

  await page.getByRole('button', { name: 'Agregar persona' }).click();
  const sheet = page.getByRole('dialog', { name: 'Agregar persona' });
  await sheet.getByLabel('Nombre').fill('Vera Visita');
  await sheet.getByLabel('Correo').fill(`vera-${suffix}@demo.platlab.test`);
  await sheet.getByRole('radio', { name: /^Visita/ }).check();
  await sheet.getByRole('button', { name: 'Agregar a la lista' }).click();
  await expect(sheet).toBeHidden();
  await page.getByRole('button', { name: /^Pendientes/ }).click();
  await expect(page.getByRole('region', { name: 'Pendientes' }).getByText(`vera-${suffix}@demo.platlab.test`)).toBeVisible();

  // Un correo que ya está en la lista es un error de su campo.
  await page.getByRole('button', { name: 'Agregar persona' }).click();
  await sheet.getByLabel('Nombre').fill('Elena otra vez');
  await sheet.getByLabel('Correo').fill('estudiante@demo.platlab.test');
  await sheet.getByRole('radio', { name: /^Estudiante/ }).check();
  await sheet.getByRole('button', { name: 'Agregar a la lista' }).click();
  await expect(sheet.getByLabel('Correo')).toHaveAttribute('aria-invalid', 'true');
  await page.keyboard.press('Escape');
  await page.context().close();
});

test('la Estudiante invitada se une y la Propietaria le quita el acceso', async ({ browser }) => {
  const invited = await signIn(browser, 'estudiante@demo.platlab.test');
  await expect(invited.getByRole('heading', { name: 'Te invitaron' })).toBeVisible();
  await expect(invited.getByText('Te agregaron como Estudiante.')).toBeVisible();
  await expectAccessible(invited, 'Entrada con invitación');
  await invited.getByRole('button', { name: 'Unirme' }).click();
  await expect(invited).toHaveURL(workspace);

  const owner = await signIn(browser, 'propietaria@demo.platlab.test');
  await owner.goto(users);
  const active = owner.getByRole('region', { name: 'Activos' });
  await expect(active.getByText('Elena Estudiante')).toBeVisible();
  await owner.getByRole('button', { name: 'Acciones de Elena Estudiante' }).click();
  await owner.getByRole('menuitem', { name: 'Quitar acceso' }).click();
  const sheet = owner.getByRole('dialog', { name: 'Quitar acceso' });
  await sheet.getByRole('button', { name: 'Quitar acceso' }).click();
  await expect(sheet).toBeHidden();
  await owner.getByRole('button', { name: /^Quitados/ }).click();
  await expect(owner.getByRole('region', { name: 'Quitados' }).getByText('Elena Estudiante')).toBeVisible();

  // Desde su próxima acción ya no entra al espacio.
  await invited.reload();
  await expect(invited.getByText('Ver mis invitaciones')).toBeVisible();
  await invited.context().close();
  await owner.context().close();
});

test('solo la Propietaria ve la sección', async ({ browser }) => {
  const page = await signIn(browser, 'docente@demo.platlab.test');
  await expect(page).toHaveURL(new RegExp(`${workspace}`));
  await expect(page.getByRole('link', { name: 'Usuarios' })).toHaveCount(0);
  await page.context().close();
});
