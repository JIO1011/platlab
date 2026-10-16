import type pg from 'pg';
import { AppError } from '../../../platform/errors.js';
import { attendCase, closeCase, insertCase, lockCase, resolveCase } from '../infrastructure/cases.queries.js';

/** Módulo dueño del recurso (02 §4): autoriza con sus permisos; la capacidad no decide permisos. */
type ModuleCode = 'equipment';

/** Lo que la capacidad necesita del caso de uso que la invoca: la transacción admitida y el actor verificado. */
export interface IncidentsContext {
  client: pg.PoolClient;
  workspaceId: string;
  principalId: string;
  moduleCode: ModuleCode;
}

type FaultType = 'electrical' | 'mechanical' | 'spare_part' | 'other';

/** Registra una falla abierta del recurso, con quien la reporta como autor. */
export async function reportCase(
  ctx: IncidentsContext,
  input: { assetId: string; faultType: FaultType; description: string; usable: boolean },
): Promise<string> {
  const [row] = await insertCase.run(
    {
      workspaceId: ctx.workspaceId,
      moduleCode: ctx.moduleCode,
      assetId: input.assetId,
      faultType: input.faultType,
      description: input.description,
      usable: input.usable,
      reportedBy: ctx.principalId,
    },
    ctx.client,
  );
  if (!row) throw new Error('La falla no devolvió fila');
  return row.id;
}

/** Bloquea la falla del módulo; NOT_FOUND si es de otro espacio o de otro módulo. */
export async function lockFault(ctx: IncidentsContext, caseId: string): Promise<{ status: string; assetId: string | null }> {
  const [row] = await lockCase.run({ workspaceId: ctx.workspaceId, caseId, moduleCode: ctx.moduleCode }, ctx.client);
  if (!row) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
  return { status: row.status, assetId: row.asset_id };
}

/** El paso no aplica al estado actual: otra persona ya avanzó la falla (lo mismo que una solicitud resuelta). */
const alreadyMoved = () => new AppError('REQUEST_RESOLVED', 'Otra persona ya avanzó esta falla: actualiza para ver su estado');

/** Abierta → en atención, con quien la toma. Se llama con la falla bloqueada. */
export async function attendFault(ctx: IncidentsContext, caseId: string): Promise<void> {
  const [row] = await attendCase.run({ workspaceId: ctx.workspaceId, caseId, actorId: ctx.principalId }, ctx.client);
  if (!row) throw alreadyMoved();
}

/** Abierta o en atención → resuelta, con su resultado. Se llama con la falla bloqueada. */
export async function resolveFault(ctx: IncidentsContext, caseId: string, resolution: string): Promise<void> {
  const [row] = await resolveCase.run({ workspaceId: ctx.workspaceId, caseId, actorId: ctx.principalId, resolution }, ctx.client);
  if (!row) throw alreadyMoved();
}

/** Resuelta → cerrada, definitiva. Se llama con la falla bloqueada. */
export async function closeFault(ctx: IncidentsContext, caseId: string): Promise<void> {
  const [row] = await closeCase.run({ workspaceId: ctx.workspaceId, caseId, actorId: ctx.principalId }, ctx.client);
  if (!row) throw alreadyMoved();
}
