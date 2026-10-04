import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { errorResponse, homeResponse, workspaceMeResponse, type ActionClass } from '@platlab/contracts';
import { buildApp } from '../../app.js';
import { createPool } from '../../platform/db/pool.js';
import { withIdempotency } from '../../platform/idempotency/idempotency.js';
import {
  addMember,
  createAdminPool,
  grantModules,
  seedWorkspace,
  setModuleStatus,
  setWorkspaceStatus,
  type Member,
  type Workspace,
} from '../../testing/core-fixtures.js';
import { createTestSigner } from '../../testing/tokens.js';
import { recordAudit, withModuleAccess, type WorkspaceAccess } from './index.js';

/**
 * T-04/T-05 contra la base local con el rol de runtime y conexiones reales: admisión de un módulo,
 * /me y /home, movimiento contra desactivación, idempotencia, auditoría y rollback.
 * Mientras R-00 no existe, un comando de prueba hace de movimiento: audita dentro de la admisión.
 */
const admin = createAdminPool();
const pool = createPool({
  connectionString:
    process.env['DATABASE_URL_API'] ??
    'postgres://platlab_api:platlab_api_local@127.0.0.1:54322/postgres',
  max: 4,
});
const signer = await createTestSigner();
const app = buildApp({ pool, verifyToken: signer.verifier });

const N: ActionClass = 'new_operation';
const R: ActionClass = 'resolve_pending';
const C: ActionClass = 'read_export';

let a: Workspace; // con Reactivos
let c: Workspace; // sin Reactivos
let adminA: Member;
let adminC: Member;

beforeAll(async () => {
  a = await seedWorkspace(admin, { modules: ['reagents'] });
  c = await seedWorkspace(admin);
  adminA = await addMember(admin, a.id, { roles: [{ role: 'admin' }] });
  adminC = await addMember(admin, c.id, { roles: [{ role: 'admin' }] });
});

afterAll(async () => {
  await app.close();
  await pool.end();
  await admin.end();
});

async function get(url: string, subject: string) {
  return app.inject({
    method: 'GET',
    url,
    headers: { authorization: `Bearer ${await signer.sign(subject)}` },
  });
}

function enterReagents<T>(
  subject: string,
  workspaceId: string,
  actionClass: ActionClass,
  work: (access: WorkspaceAccess) => Promise<T>,
): Promise<T> {
  return withModuleAccess(pool, { subject, workspaceId, moduleCode: 'reagents', actionClass }, work);
}

/** Resultado de intentar entrar: 'admitted' o el código de error. */
async function outcome(subject: string, workspaceId: string, actionClass: ActionClass): Promise<string> {
  return enterReagents(subject, workspaceId, actionClass, async () => 'admitted').catch(
    (error: { code?: string }) => error.code ?? 'unexpected',
  );
}

/** Espacio nuevo con Reactivos y un Administrador, para pruebas que cambian estados. */
async function freshWorkspace() {
  const workspace = await seedWorkspace(admin, { modules: ['reagents'] });
  const member = await addMember(admin, workspace.id, { roles: [{ role: 'admin' }] });
  return { workspace, member };
}

const auditCount = async (workspaceId: string) =>
  Number(
    (await admin.query<{ n: string }>('select count(*) as n from core.audit_events where workspace_id = $1', [workspaceId]))
      .rows[0]!.n,
  );

/**
 * Espera a que una sesión quede bloqueada: la del runtime (por su rol, porque pg_stat_activity
 * recorta las consultas largas) o la de un comando del Equipo PlatLab (por su consulta corta).
 */
async function waitForLockWait(waiter: 'runtime' | 'set_module_status' | 'apply_contract_revision') {
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    const { rows } = await admin.query<{ n: string }>(
      `select count(*) as n from pg_stat_activity
        where wait_event_type = 'Lock'
          and case when $1 = 'runtime' then usename = 'platlab_api' else query like '%' || $1 || '%' end`,
      [waiter],
    );
    if (Number(rows[0]!.n) > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Ninguna sesión quedó esperando un bloqueo: ${waiter}`);
}

describe('/me y /home según los módulos del espacio', () => {
  it('el Administrador de A ve Reactivos en el menú y en el Inicio', async () => {
    const me = workspaceMeResponse.parse((await get(`/v1/workspaces/${a.id}/me`, adminA.subject)).json());
    expect(me.modules.map((module) => module.code)).toEqual(['reagents']);
    const home = homeResponse.parse((await get(`/v1/workspaces/${a.id}/home`, adminA.subject)).json());
    expect(home.cards).toEqual([
      { moduleCode: 'reagents', name: 'Reactivos', summary: { productsWithStock: 0, positionsWithStock: 0, pendingRequests: 0 }, activity: [], trend: null },
    ]);
  });

  it('C, sin Reactivos, no lo ve en el menú ni en el Inicio aunque el rol tenga sus permisos', async () => {
    const me = workspaceMeResponse.parse((await get(`/v1/workspaces/${c.id}/me`, adminC.subject)).json());
    expect(me.modules).toEqual([]);
    expect(me.permissions).toEqual([]);
    const home = homeResponse.parse((await get(`/v1/workspaces/${c.id}/home`, adminC.subject)).json());
    expect(home.cards).toEqual([]);
  });

  it('el propietario ve el menú y la tarjeta como el Administrador', async () => {
    const me = workspaceMeResponse.parse((await get(`/v1/workspaces/${a.id}/me`, a.owner.subject)).json());
    expect(me.modules).toEqual([
      expect.objectContaining({ code: 'reagents', nav: [expect.objectContaining({ path: 'reactivos' })] }),
    ]);
    const home = homeResponse.parse((await get(`/v1/workspaces/${a.id}/home`, a.owner.subject)).json());
    expect(home.cards).toEqual([expect.objectContaining({ moduleCode: 'reagents' })]);
  });

  it('un miembro sin rol ve el módulo sin menú ni tarjeta', async () => {
    const member = await addMember(admin, a.id);
    const me = workspaceMeResponse.parse((await get(`/v1/workspaces/${a.id}/me`, member.subject)).json());
    expect(me.modules).toEqual([expect.objectContaining({ code: 'reagents', nav: [] })]);
    const home = homeResponse.parse((await get(`/v1/workspaces/${a.id}/home`, member.subject)).json());
    expect(home.cards).toEqual([]);
  });
});

describe('admisión de un módulo', () => {
  it('C recibe «módulo no disponible» y quien no es miembro, la denegación de siempre', async () => {
    expect(await outcome(adminC.subject, c.id, C)).toBe('MODULE_UNAVAILABLE');
    expect(await outcome(adminC.subject, a.id, C)).toBe('ACCESS_DENIED');
    expect(await outcome(adminA.subject, c.id, C)).toBe('ACCESS_DENIED');
  });

  it('un módulo habilitado admite las tres clases de acción', async () => {
    for (const action of [N, R, C]) expect(await outcome(adminA.subject, a.id, action)).toBe('admitted');
  });

  it('cada estado operativo admite solo sus clases y /me lo refleja', async () => {
    const { workspace, member } = await freshWorkspace();
    const expectations: Array<[status: 'draining' | 'read_only' | 'disabled', allowed: ActionClass[]]> = [
      ['draining', [R, C]],
      ['read_only', [C]],
      ['disabled', []],
    ];
    for (const [status, allowed] of expectations) {
      await setModuleStatus(admin, workspace.id, 'reagents', status);
      for (const action of [N, R, C]) {
        const expected = allowed.includes(action)
          ? 'admitted'
          : allowed.length === 0
            ? 'MODULE_UNAVAILABLE'
            : 'MODULE_READ_ONLY';
        expect({ status, action, result: await outcome(member.subject, workspace.id, action) }).toEqual({
          status,
          action,
          result: expected,
        });
      }
      const me = workspaceMeResponse.parse((await get(`/v1/workspaces/${workspace.id}/me`, member.subject)).json());
      expect(me.modules.map((module) => module.access)).toEqual(allowed.length ? [allowed] : []);
    }
  });

  it('un derecho vencido dentro del periodo de cierre solo resuelve pendientes y consulta', async () => {
    const { workspace, member } = await freshWorkspace();
    const day = 24 * 3600 * 1000;
    await grantModules(admin, workspace.id, [
      {
        code: 'reagents',
        validFrom: new Date(Date.now() - 10 * day).toISOString(),
        validUntil: new Date(Date.now() - day).toISOString(),
        closingUntil: new Date(Date.now() + day).toISOString(),
        readUntil: new Date(Date.now() + 2 * day).toISOString(),
      },
    ]);
    expect(await outcome(member.subject, workspace.id, N)).toBe('MODULE_READ_ONLY');
    expect(await outcome(member.subject, workspace.id, R)).toBe('admitted');
    expect(await outcome(member.subject, workspace.id, C)).toBe('admitted');
  });

  it('un espacio suspendido por motivo comercial resuelve y consulta, pero no opera', async () => {
    const { workspace, member } = await freshWorkspace();
    await setWorkspaceStatus(admin, workspace.id, 'suspended', 'commercial');
    expect(await outcome(member.subject, workspace.id, N)).toBe('WORKSPACE_RESTRICTED');
    expect(await outcome(member.subject, workspace.id, R)).toBe('admitted');
    expect(await outcome(member.subject, workspace.id, C)).toBe('admitted');
  });

  it('un espacio suspendido por seguridad no admite nada por la vía normal', async () => {
    const { workspace, member } = await freshWorkspace();
    await setWorkspaceStatus(admin, workspace.id, 'suspended', 'security');
    for (const action of [N, R, C]) expect(await outcome(member.subject, workspace.id, action)).toBe('ACCESS_DENIED');
    const me = await get(`/v1/workspaces/${workspace.id}/me`, member.subject);
    expect(me.statusCode).toBe(403);
    expect(errorResponse.parse(me.json()).error.code).toBe('ACCESS_DENIED');
  });
});

describe('cambios de estado simultáneos (orden fijo espacio → derecho → membresía)', () => {
  const testAudit = (access: WorkspaceAccess) =>
    recordAudit(access, { action: 'reagents.test.create', entityType: 'reagents.test' });

  it('una desactivación espera a la operación en curso y las siguientes ya no entran', async () => {
    const { workspace, member } = await freshWorkspace();
    let deactivation: Promise<void> | undefined;

    await enterReagents(member.subject, workspace.id, N, async (access) => {
      await testAudit(access);
      deactivation = setModuleStatus(admin, workspace.id, 'reagents', 'disabled');
      await waitForLockWait('set_module_status');
    });
    await deactivation;

    expect(await auditCount(workspace.id)).toBe(1);
    expect(await outcome(member.subject, workspace.id, N)).toBe('MODULE_UNAVAILABLE');
  });

  it('una operación que espera a una desactivación no se confirma después de ella', async () => {
    const { workspace, member } = await freshWorkspace();
    const other = await admin.connect();
    try {
      await other.query('BEGIN');
      await setModuleStatus(other, workspace.id, 'reagents', 'disabled');

      const command = enterReagents(member.subject, workspace.id, N, async (access) => {
        await testAudit(access);
        return 'confirmado';
      });
      command.catch(() => undefined); // se comprueba abajo; evita un rechazo sin manejar mientras espera
      await waitForLockWait('runtime');
      await other.query('COMMIT');

      await expect(command).rejects.toMatchObject({ code: 'MODULE_UNAVAILABLE' });
      expect(await auditCount(workspace.id)).toBe(0);
    } finally {
      await other.query('ROLLBACK').catch(() => undefined);
      other.release();
    }
  });

  it('aplicar un contrato espera a la admisión en curso, y la admisión espera a un contrato en curso', async () => {
    const { workspace, member } = await freshWorkspace();
    let applying: Promise<string> | undefined;
    await enterReagents(member.subject, workspace.id, N, async () => {
      applying = grantModules(admin, workspace.id, [{ code: 'reagents' }]);
      await waitForLockWait('apply_contract_revision');
    });
    await applying;

    const other = await admin.connect();
    try {
      await other.query('BEGIN');
      const revision = await other.query<{ id: string }>(
        `insert into platform.contract_revisions (workspace_id, contract_id, revision_number, kind)
         select workspace_id, contract_id, max(revision_number) + 1, 'demo'
           from platform.contract_revisions where workspace_id = $1
          group by workspace_id, contract_id
         returning id`,
        [workspace.id],
      );
      await other.query(
        `insert into platform.contract_revision_modules (workspace_id, revision_id, module_code, valid_from)
         values ($1, $2, 'reagents', now() - interval '1 day')`,
        [workspace.id, revision.rows[0]!.id],
      );
      await other.query(`select platform.apply_contract_revision($1, 'pruebas')`, [revision.rows[0]!.id]);

      const command = enterReagents(member.subject, workspace.id, N, async () => 'admitida');
      command.catch(() => undefined);
      await waitForLockWait('runtime');
      await other.query('COMMIT');
      await expect(command).resolves.toBe('admitida');
    } finally {
      await other.query('ROLLBACK').catch(() => undefined);
      other.release();
    }
  });
});

describe('idempotencia, auditoría y rollback en la misma transacción', () => {
  interface TestInput {
    quantity: string;
    reason: string;
  }

  /** Comando de prueba: admisión, clave idempotente, auditoría y resultado en una transacción. */
  function testCommand(
    subject: string,
    workspaceId: string,
    key: string | undefined,
    input: TestInput,
    options: { failAfterAudit?: boolean } = {},
  ) {
    return enterReagents(subject, workspaceId, N, (access) =>
      withIdempotency(
        access.client,
        {
          workspaceId: access.workspace.id,
          principalId: access.principalId,
          operation: 'reagents.test.create',
          key,
          input,
        },
        async () => {
          const auditId = await recordAudit(access, {
            action: 'reagents.test.create',
            entityType: 'reagents.test',
            reason: input.reason,
            changes: { quantity: input.quantity },
          });
          if (options.failAfterAudit) throw new Error('fallo provocado antes del commit');
          return { auditId, quantity: input.quantity };
        },
      ),
    );
  }

  const input = { quantity: '20.000', reason: 'práctica' };
  const recordCount = async (workspaceId: string) =>
    Number(
      (
        await admin.query<{ n: string }>(
          'select count(*) as n from platform.idempotency_records where workspace_id = $1',
          [workspaceId],
        )
      ).rows[0]!.n,
    );

  it('repetir con la misma clave y contenido devuelve el mismo resultado sin otra auditoría', async () => {
    const { workspace, member } = await freshWorkspace();
    const first = await testCommand(member.subject, workspace.id, 'clave-repetida-1', input);
    const again = await testCommand(member.subject, workspace.id, 'clave-repetida-1', {
      reason: input.reason,
      quantity: input.quantity,
    });
    expect(again).toEqual(first);
    expect(await auditCount(workspace.id)).toBe(1);
    expect(await recordCount(workspace.id)).toBe(1);
  });

  it('la misma clave con otro contenido se rechaza y no ejecuta nada', async () => {
    const { workspace, member } = await freshWorkspace();
    await testCommand(member.subject, workspace.id, 'clave-cambiada-1', input);
    await expect(
      testCommand(member.subject, workspace.id, 'clave-cambiada-1', { ...input, quantity: '60.000' }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });
    expect(await auditCount(workspace.id)).toBe(1);
  });

  it('dos duplicados simultáneos producen un solo efecto y la misma respuesta', async () => {
    const { workspace, member } = await freshWorkspace();
    const results = await Promise.all([
      testCommand(member.subject, workspace.id, 'clave-simultanea-1', input),
      testCommand(member.subject, workspace.id, 'clave-simultanea-1', input),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect(await auditCount(workspace.id)).toBe(1);
  });

  it('un fallo antes del commit no deja auditoría ni clave, y el reintento funciona', async () => {
    const { workspace, member } = await freshWorkspace();
    await expect(
      testCommand(member.subject, workspace.id, 'clave-rollback-1', input, { failAfterAudit: true }),
    ).rejects.toThrow('fallo provocado antes del commit');
    expect(await auditCount(workspace.id)).toBe(0);
    expect(await recordCount(workspace.id)).toBe(0);

    await expect(testCommand(member.subject, workspace.id, 'clave-rollback-1', input)).resolves.toMatchObject({
      quantity: '20.000',
    });
    expect(await auditCount(workspace.id)).toBe(1);
  });

  it('la clave se acota por actor y, sin clave, cada llamada se ejecuta', async () => {
    const { workspace, member } = await freshWorkspace();
    const otherMember = await addMember(admin, workspace.id, { roles: [{ role: 'operator' }] });
    await testCommand(member.subject, workspace.id, 'clave-por-actor-1', input);
    await testCommand(otherMember.subject, workspace.id, 'clave-por-actor-1', input);
    await testCommand(member.subject, workspace.id, undefined, input);
    await testCommand(member.subject, workspace.id, undefined, input);
    expect(await auditCount(workspace.id)).toBe(4);
  });

  it('la auditoría registra el actor admitido, la acción, el motivo y la correlación', async () => {
    const { workspace, member } = await freshWorkspace();
    await testCommand(member.subject, workspace.id, undefined, input);
    const { rows } = await admin.query(
      `select actor_principal_id, action, entity_type, reason, changes, correlation_id
         from core.audit_events where workspace_id = $1`,
      [workspace.id],
    );
    expect(rows).toEqual([
      {
        actor_principal_id: member.principalId,
        action: 'reagents.test.create',
        entity_type: 'reagents.test',
        reason: 'práctica',
        changes: { quantity: '20.000' },
        correlation_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      },
    ]);
  });
});
