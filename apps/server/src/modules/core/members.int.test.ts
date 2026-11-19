import { afterAll, describe, expect, it } from 'vitest';
import { acceptedInvitation, memberDirectory, myInvitations, myWorkspacesResponse, pendingInvitation, workspaceMeResponse } from '@platlab/contracts';
import { admin, auditsIn, call, errorCode } from '../../testing/api.js';
import { addMember, seedWorkspace, setWorkspaceStatus, uniqueSuffix } from '../../testing/core-fixtures.js';
import { createPool } from '../../platform/db/pool.js';
import { withWorkspaceAccess } from './index.js';

/**
 * U-01 (ADR 0027): Usuarios por HTTP con el rol de runtime. Solo el Propietario gestiona la lista blanca; quien fue
 * invitado se une con el correo de su sesión y una acción explícita; cambiar el rol y quitar bloquean la membresía;
 * nada se borra y el último acceso marca la inactividad.
 */

/** Conexión aparte del runtime para sostener una operación en curso del miembro mientras el Propietario lo quita. */
const runtime = createPool({
  connectionString: process.env['DATABASE_URL_API'] ?? 'postgres://platlab_api:platlab_api_local@127.0.0.1:54322/postgres',
  max: 1,
});
afterAll(() => runtime.end());

async function createMembersLab() {
  const workspace = await seedWorkspace(admin, { modules: ['labs', 'equipment'] });
  return {
    workspace,
    base: `/workspaces/${workspace.id}`,
    owner: workspace.owner,
    adminMember: await addMember(admin, workspace.id, { roles: [{ role: 'admin' }], displayName: 'Administradora' }),
  };
}
type MembersLab = Awaited<ReturnType<typeof createMembersLab>>;

const newPerson = () => ({ subject: `sub-${uniqueSuffix()}`, email: `persona-${uniqueSuffix()}@demo.test` });

async function directory(lab: MembersLab) {
  const response = await call(lab.owner.subject, `${lab.base}/members`);
  expect(response.status).toBe(200);
  return memberDirectory.parse(response.body);
}

async function invite(lab: MembersLab, email: string, role = 'visitor', name = 'Persona invitada') {
  const response = await call(lab.owner.subject, `${lab.base}/members`, { method: 'POST', body: { name, email, role } });
  expect(response.status).toBe(201);
  return pendingInvitation.parse(response.body);
}

const accept = (lab: MembersLab, person: { subject: string; email: string }, invitationId: string) =>
  call(person.subject, `${lab.base}/invitations/${invitationId}/accept`, { method: 'POST', email: person.email });

async function join(lab: MembersLab, person: { subject: string; email: string }, role = 'visitor') {
  const invitation = await invite(lab, person.email, role);
  const response = await accept(lab, person, invitation.id);
  expect(response.status).toBe(200);
  return acceptedInvitation.parse(response.body);
}

describe('Usuarios: lista blanca del Propietario', () => {
  it('solo el Propietario consulta y cambia Usuarios', async () => {
    const lab = await createMembersLab();
    const list = await directory(lab);
    expect(list.members.map((member) => member.name).sort()).toEqual(['Administradora', `Propietario de ${lab.workspace.code}`].sort());
    expect(list.members.find((member) => member.isOwner)?.role).toBeNull();
    expect(list.members.find((member) => !member.isOwner)?.role).toBe('admin');
    expect(list.inactiveAfterDays).toBe(30);

    const denied = await call(lab.adminMember.subject, `${lab.base}/members`);
    expect(denied.status).toBe(403);
    expect(errorCode(denied.body)).toBe('ACCESS_DENIED');
    const inviteDenied = await call(lab.adminMember.subject, `${lab.base}/members`, {
      method: 'POST',
      body: { name: 'X', email: 'x@demo.test', role: 'teacher' },
    });
    expect(inviteDenied.status).toBe(403);
  });

  it('suma un correo pendiente, sin repetirlo ni invitar a un miembro', async () => {
    const lab = await createMembersLab();
    const audits = await auditsIn(lab.workspace.id);
    const email = `Mayus-${uniqueSuffix()}@Demo.test`;
    const created = await invite(lab, email, 'student', 'Estudiante nueva');
    expect(created).toMatchObject({ email: email.toLowerCase(), role: 'student', name: 'Estudiante nueva' });
    expect((await directory(lab)).invitations.map((invitation) => invitation.id)).toEqual([created.id]);
    expect(await auditsIn(lab.workspace.id)).toBe(audits + 1);

    const repeated = await call(lab.owner.subject, `${lab.base}/members`, { method: 'POST', body: { name: 'Otra', email, role: 'teacher' } });
    expect(repeated.status).toBe(409);
    expect(errorCode(repeated.body)).toBe('EMAIL_TAKEN');

    await admin.query(`update core.identities set email = 'ya-miembro@demo.test' where id = $1`, [lab.adminMember.identityId]);
    const member = await call(lab.owner.subject, `${lab.base}/members`, {
      method: 'POST',
      body: { name: 'Ana', email: 'ya-miembro@demo.test', role: 'operator' },
    });
    expect(errorCode(member.body)).toBe('EMAIL_TAKEN');

    const badRole = await call(lab.owner.subject, `${lab.base}/members`, {
      method: 'POST',
      body: { name: 'RF', email: 'rf@demo.test', role: 'regulatory_officer' },
    });
    expect(badRole.status).toBe(400);
  });

  it('anula una invitación pendiente', async () => {
    const lab = await createMembersLab();
    const person = newPerson();
    const invitation = await invite(lab, person.email);
    const revoked = await call(lab.owner.subject, `${lab.base}/invitations/${invitation.id}/revoke`, { method: 'POST' });
    expect(revoked.status).toBe(200);
    expect((await directory(lab)).invitations).toEqual([]);
    const mine = await call(person.subject, '/me/invitations', { email: person.email });
    expect(myInvitations.parse(mine.body).invitations).toEqual([]);
    expect((await accept(lab, person, invitation.id)).status).toBe(404);
    const again = await call(lab.owner.subject, `${lab.base}/invitations/${invitation.id}/revoke`, { method: 'POST' });
    expect(errorCode(again.body)).toBe('NOT_FOUND');
  });
});

describe('Usuarios: unirse con el correo de la sesión', () => {
  it('ve solo las invitaciones de su correo', async () => {
    const lab = await createMembersLab();
    const person = newPerson();
    await invite(lab, person.email, 'teacher');

    const mine = myInvitations.parse((await call(person.subject, '/me/invitations', { email: person.email })).body);
    expect(mine.invitations).toEqual([expect.objectContaining({ workspaceId: lab.workspace.id, role: 'teacher' })]);
    const withoutEmail = myInvitations.parse((await call(person.subject, '/me/invitations')).body);
    expect(withoutEmail.invitations).toEqual([]);
    const other = myInvitations.parse((await call(person.subject, '/me/invitations', { email: 'otra@demo.test' })).body);
    expect(other.invitations).toEqual([]);
  });

  it('se une con el rol de la invitación; repetirlo devuelve lo mismo', async () => {
    const lab = await createMembersLab();
    const person = newPerson();
    const invitation = await invite(lab, person.email, 'visitor', 'Víctor Visita');
    const audits = await auditsIn(lab.workspace.id);

    const intruder = await accept(lab, { subject: person.subject, email: 'intruso@demo.test' }, invitation.id);
    expect(intruder.status).toBe(404);

    const joined = acceptedInvitation.parse((await accept(lab, person, invitation.id)).body);
    expect(joined.workspaceId).toBe(lab.workspace.id);
    expect(await auditsIn(lab.workspace.id)).toBe(audits + 1);
    const retry = await accept(lab, person, invitation.id);
    expect(acceptedInvitation.parse(retry.body).membershipId).toBe(joined.membershipId);

    const me = workspaceMeResponse.parse((await call(person.subject, `${lab.base}/me`)).body);
    expect(me.member).toMatchObject({ displayName: 'Víctor Visita', isOwner: false, roles: ['Visita'] });
    // La Visita tiene los permisos del Docente y el Estudiante: pide en Laboratorios y reporta fallas.
    expect(me.permissions).toEqual(expect.arrayContaining(['labs.read', 'labs.request.create', 'equipment.fault.report']));
    expect(me.permissions).not.toContain('labs.request.review');

    const workspaces = myWorkspacesResponse.parse((await call(person.subject, '/me/workspaces')).body);
    expect(workspaces.workspaces.map((workspace) => workspace.id)).toContain(lab.workspace.id);
    const list = await directory(lab);
    expect(list.invitations).toEqual([]);
    expect(list.members.find((member) => member.membershipId === joined.membershipId)).toMatchObject({
      email: person.email,
      role: 'visitor',
      status: 'active',
      inactive: false,
    });
  });

  it('un espacio suspendido no admite nuevos miembros', async () => {
    const lab = await createMembersLab();
    const person = newPerson();
    const invitation = await invite(lab, person.email);
    await setWorkspaceStatus(admin, lab.workspace.id, 'suspended', 'commercial');
    const response = await accept(lab, person, invitation.id);
    expect(response.status).toBe(403);
    expect(errorCode(response.body)).toBe('WORKSPACE_RESTRICTED');
  });
});

describe('Usuarios: rol, quitar e inactividad', () => {
  it('cambia el rol sin tocar al Propietario', async () => {
    const lab = await createMembersLab();
    const person = newPerson();
    const { membershipId } = await join(lab, person, 'student');

    const changed = await call(lab.owner.subject, `${lab.base}/members/${membershipId}`, { method: 'PATCH', body: { role: 'operator' } });
    expect(changed.status).toBe(200);
    const me = workspaceMeResponse.parse((await call(person.subject, `${lab.base}/me`)).body);
    expect(me.member.roles).toEqual(['Operador']);
    const open = await admin.query(
      `select count(*)::int as n from core.role_assignments ra join core.principals p on p.id = ra.principal_id
        where p.membership_id = $1 and ra.revoked_at is null`,
      [membershipId],
    );
    expect(open.rows[0]).toEqual({ n: 1 });

    const owner = await call(lab.owner.subject, `${lab.base}/members/${lab.owner.membershipId}`, { method: 'PATCH', body: { role: 'teacher' } });
    expect(owner.status).toBe(400);
    expect(errorCode(owner.body)).toBe('VALIDATION_FAILED');
  });

  it('quita el acceso sin borrar y volver a invitarla reactiva la misma membresía', async () => {
    const lab = await createMembersLab();
    const person = newPerson();
    const { membershipId } = await join(lab, person, 'teacher');

    const revoked = await call(lab.owner.subject, `${lab.base}/members/${membershipId}/revoke`, { method: 'POST' });
    expect(revoked.status).toBe(200);
    expect((await call(person.subject, `${lab.base}/me`)).status).toBe(403);
    const removed = (await directory(lab)).members.find((member) => member.membershipId === membershipId);
    expect(removed).toMatchObject({ status: 'revoked', role: null });
    expect(removed?.revokedAt).not.toBeNull();

    const ownerRevoke = await call(lab.owner.subject, `${lab.base}/members/${lab.owner.membershipId}/revoke`, { method: 'POST' });
    expect(errorCode(ownerRevoke.body)).toBe('VALIDATION_FAILED');

    const again = await join(lab, person, 'student');
    expect(again.membershipId).toBe(membershipId);
    const me = workspaceMeResponse.parse((await call(person.subject, `${lab.base}/me`)).body);
    expect(me.member.roles).toEqual(['Estudiante']);
  });

  it('quitar espera a la operación en curso del miembro y la siguiente ya no entra (02 §6)', async () => {
    const lab = await createMembersLab();
    const person = newPerson();
    const { membershipId } = await join(lab, person, 'operator');
    let release = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    let entered = () => {};
    const inside = new Promise<void>((resolve) => (entered = resolve));
    const inFlight = withWorkspaceAccess(
      runtime,
      { subject: person.subject, workspaceId: lab.workspace.id, actionClass: 'new_operation' },
      async () => {
        entered();
        await held;
        return 'terminó con sus permisos';
      },
    );
    await inside;

    let revokedAt = 0;
    const revoke = call(lab.owner.subject, `${lab.base}/members/${membershipId}/revoke`, { method: 'POST' }).then((response) => {
      revokedAt = Date.now();
      return response;
    });
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(revokedAt).toBe(0);
    const releasedAt = Date.now();
    release();

    await expect(inFlight).resolves.toBe('terminó con sus permisos');
    expect((await revoke).status).toBe(200);
    expect(revokedAt).toBeGreaterThanOrEqual(releasedAt);
    expect((await call(person.subject, `${lab.base}/me`)).status).toBe(403);
  });

  it('el último acceso marca a quien no entra hace más de 30 días', async () => {
    const lab = await createMembersLab();
    expect((await directory(lab)).members.find((member) => !member.isOwner)?.lastSeenAt).toBeNull();

    expect((await call(lab.adminMember.subject, `${lab.base}/me`)).status).toBe(200);
    const seen = (await directory(lab)).members.find((member) => !member.isOwner);
    expect(seen?.lastSeenAt).not.toBeNull();
    expect(seen?.inactive).toBe(false);

    await admin.query(`update core.member_presence set last_seen_at = now() - interval '40 days' where membership_id = $1`, [
      lab.adminMember.membershipId,
    ]);
    expect((await directory(lab)).members.find((member) => !member.isOwner)?.inactive).toBe(true);
    // Volver a entrar renueva el acceso aunque la última escritura sea de hace más de una hora.
    await call(lab.adminMember.subject, `${lab.base}/me`);
    expect((await directory(lab)).members.find((member) => !member.isOwner)?.inactive).toBe(false);

    // Quien nunca entró cuenta desde que se unió.
    await admin.query(`update core.memberships set created_at = now() - interval '40 days' where id = $1`, [lab.owner.membershipId]);
    expect((await directory(lab)).members.find((member) => member.isOwner)?.inactive).toBe(true);
  });
});
