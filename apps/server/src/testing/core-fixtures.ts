import { randomUUID } from 'node:crypto';
import pg from 'pg';

/**
 * Datos sintéticos de Core para pruebas de integración. Se escriben como dueño de las tablas,
 * igual que los fixtures: el runtime no tiene INSERT en Core. Cada llamada usa códigos únicos,
 * así las pruebas no dependen del orden ni comparten filas.
 */
export function createAdminPool(): pg.Pool {
  return new pg.Pool({
    connectionString:
      process.env['DATABASE_URL_ADMIN'] ?? 'postgres://postgres:postgres@127.0.0.1:54322/postgres',
    max: 2,
  });
}

export const uniqueSuffix = () => randomUUID().slice(0, 8);

export interface Member {
  identityId: string;
  subject: string;
  membershipId: string;
  principalId: string;
}

export interface Workspace {
  id: string;
  code: string;
  owner: Member;
}

type WorkspaceStatus = 'provisioning' | 'trial' | 'active';
type ContractKind = 'demo' | 'pilot' | 'standard';

export interface RoleGrant {
  role: string;
  locationId?: string | null;
  validFrom?: string;
  validUntil?: string | null;
  revoked?: boolean;
}

/** Identidad por sujeto del JWT; si ya existe (miembro de varios espacios), se reutiliza. */
async function upsertIdentity(admin: pg.Pool, subject: string, displayName: string) {
  const { rows } = await admin.query<{ id: string }>(
    `insert into core.identities (provider, provider_subject, display_name)
     values ('supabase', $1, $2)
     on conflict (provider, provider_subject) do update set display_name = excluded.display_name
     returning id`,
    [subject, displayName],
  );
  return rows[0]!.id;
}

export async function addMember(
  admin: pg.Pool,
  workspaceId: string,
  options: { subject?: string; displayName?: string; roles?: RoleGrant[] } = {},
): Promise<Member> {
  const subject = options.subject ?? `sub-${uniqueSuffix()}`;
  const identityId = await upsertIdentity(admin, subject, options.displayName ?? `Miembro ${subject}`);
  const membership = await admin.query<{ id: string }>(
    `insert into core.memberships (workspace_id, identity_id) values ($1, $2) returning id`,
    [workspaceId, identityId],
  );
  const membershipId = membership.rows[0]!.id;
  const principal = await admin.query<{ id: string }>(
    `insert into core.principals (workspace_id, kind, membership_id) values ($1, 'member', $2) returning id`,
    [workspaceId, membershipId],
  );
  const principalId = principal.rows[0]!.id;
  for (const grant of options.roles ?? []) {
    await admin.query(
      `insert into core.role_assignments
         (workspace_id, principal_id, role_code, location_id, valid_from, valid_until, revoked_at)
       values ($1, $2, $3, $4, coalesce($5::timestamptz, now()), $6, case when $7 then now() end)`,
      [
        workspaceId,
        principalId,
        grant.role,
        grant.locationId ?? null,
        grant.validFrom ?? null,
        grant.validUntil ?? null,
        grant.revoked ?? false,
      ],
    );
  }
  return { identityId, subject, membershipId, principalId };
}

export interface ModuleGrant {
  code: string;
  validFrom?: string;
  validUntil?: string | null;
  closingUntil?: string | null;
  readUntil?: string | null;
}

/**
 * Habilita módulos como lo hará el Equipo PlatLab: una revisión nueva del contrato aplicada con
 * platform.apply_contract_revision (T-04: los fixtures usan el comando). La revisión debe incluir
 * todos los módulos que el espacio ya tiene, porque retirar uno todavía no se admite.
 */
export async function grantModules(
  admin: pg.Pool,
  workspaceId: string,
  modules: ModuleGrant[],
  kind: ContractKind = 'demo',
): Promise<string> {
  const contract = await admin.query<{ id: string }>(
    `insert into platform.contracts (workspace_id) values ($1)
     on conflict (workspace_id) do update set workspace_id = excluded.workspace_id
     returning id`,
    [workspaceId],
  );
  const contractId = contract.rows[0]!.id;
  const revision = await admin.query<{ id: string }>(
    `insert into platform.contract_revisions (workspace_id, contract_id, revision_number, kind)
     select $1, $2, coalesce(max(revision_number), 0) + 1, $3
       from platform.contract_revisions where contract_id = $2
     returning id`,
    [workspaceId, contractId, kind],
  );
  const revisionId = revision.rows[0]!.id;
  for (const module of modules) {
    await admin.query(
      `insert into platform.contract_revision_modules
         (workspace_id, revision_id, module_code, valid_from, valid_until, closing_until, read_until)
       values ($1, $2, $3, coalesce($4::timestamptz, now() - interval '1 day'), $5, $6, $7)`,
      [
        workspaceId,
        revisionId,
        module.code,
        module.validFrom ?? null,
        module.validUntil ?? null,
        module.closingUntil ?? null,
        module.readUntil ?? null,
      ],
    );
  }
  await admin.query(`select platform.apply_contract_revision($1, 'fixtures')`, [revisionId]);
  return revisionId;
}

export async function setModuleStatus(
  admin: pg.Pool | pg.PoolClient,
  workspaceId: string,
  moduleCode: string,
  status: 'disabled' | 'enabled' | 'draining' | 'read_only',
): Promise<void> {
  await admin.query(`select platform.set_module_status($1, $2, $3)`, [workspaceId, moduleCode, status]);
}

export async function setWorkspaceStatus(
  admin: pg.Pool,
  workspaceId: string,
  status: string,
  suspensionReason: 'commercial' | 'security' | null = null,
): Promise<void> {
  await admin.query(
    `update core.workspaces set status = $2, suspension_reason = $3, version = version + 1
      where id = $1`,
    [workspaceId, status, suspensionReason],
  );
}

/** Espacio con propietario sin rol operativo, como el de la demo (primer incremento). */
export async function seedWorkspace(
  admin: pg.Pool,
  options: { status?: WorkspaceStatus; ownerSubject?: string; modules?: string[] } = {},
): Promise<Workspace> {
  const code = `test-${uniqueSuffix()}`;
  const account = await admin.query<{ id: string }>(
    `insert into platform.customer_accounts (legal_name) values ($1) returning id`,
    [`Titular ${code}`],
  );
  const workspace = await admin.query<{ id: string }>(
    `insert into core.workspaces (customer_account_id, code, name, time_zone)
     values ($1, $2, $3, 'America/Guayaquil') returning id`,
    [account.rows[0]!.id, code, `Espacio ${code}`],
  );
  const id = workspace.rows[0]!.id;
  const owner = await addMember(admin, id, {
    ...(options.ownerSubject ? { subject: options.ownerSubject } : {}),
    displayName: `Propietario de ${code}`,
  });
  await admin.query(
    `update core.workspaces set owner_membership_id = $2, status = $3 where id = $1`,
    [id, owner.membershipId, options.status ?? 'active'],
  );
  if (options.modules?.length) {
    await grantModules(admin, id, options.modules.map((moduleCode) => ({ code: moduleCode })));
  }
  return { id, code, owner };
}

export async function addLocation(
  admin: pg.Pool,
  workspaceId: string,
  options: { kind: string; parentId?: string },
): Promise<string> {
  const code = `L-${uniqueSuffix()}`;
  const { rows } = await admin.query<{ id: string }>(
    `insert into core.locations (workspace_id, parent_id, kind, code, name)
     values ($1, $2, $3, $4, $4) returning id`,
    [workspaceId, options.parentId ?? null, options.kind, code],
  );
  return rows[0]!.id;
}

export async function revokeMembership(admin: pg.Pool, membershipId: string): Promise<void> {
  await admin.query(
    `update core.memberships set status = 'revoked', revoked_at = now(), version = version + 1
      where id = $1`,
    [membershipId],
  );
}
