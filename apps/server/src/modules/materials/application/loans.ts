import type pg from 'pg';
import type { z } from 'zod';
import { compareDecimals, subtractDecimals, sumDecimals, type Loan, type lendRequest, type returnRequest } from '@platlab/contracts';
import {
  applyMovement,
  holdForLoan,
  lockExistingPosition,
  releaseLoanHold,
  type LockedPosition,
} from '../../../capabilities/inventory/index.js';
import { lockKey } from '../../../platform/db/codes.js';
import { todayIn } from '../../../platform/dates.js';
import { AppError } from '../../../platform/errors.js';
import { listActiveMembers, recordAudit, type WorkspaceAccess } from '../../core/index.js';
import {
  advanceLoan,
  applyLineReturn,
  insertLoan,
  insertLoanLine,
  insertReturnLine,
  loanableClasses,
  loanLinesOf,
  lockLoan,
  nextLoanNumber,
} from '../infrastructure/loans.queries.js';
import { inventoryContext, LOAN, RETURN, requires, runCommand, type CommandRequest } from './command.js';
import { loanById, loanCode } from './loan-views.js';

/**
 * Préstamos (ADR 0025): prestar aparta lo prestado en su posición (sigue en el saldo, ya no está disponible);
 * devolver lo libera, y lo dañado o perdido además da de baja con un ajuste del libro. Orden de bloqueo
 * de «datos»: vale → posiciones (por id) → líneas, que solo cambia quien tiene el vale.
 */

const ZERO = '0';
const positive = (quantity: string) => compareDecimals(quantity, ZERO) > 0;
/** Todas las operaciones toman las posiciones en el mismo orden para no entrelazarse. */
const byPosition = <T extends { positionId: string }>(items: readonly T[]) =>
  [...items].sort((a, b) => a.positionId.localeCompare(b.positionId));

async function requireBorrower(access: WorkspaceAccess, borrowerId: string): Promise<void> {
  const members = await listActiveMembers(access);
  if (!members.some((member) => member.id === borrowerId)) {
    throw new AppError('VALIDATION_FAILED', 'El prestatario no es un miembro activo del espacio');
  }
}

/** Presta material reutilizable a un miembro: un vale con sus líneas, cada una apartada en su posición. */
export function lendMaterial(pool: pg.Pool, request: CommandRequest, input: z.infer<typeof lendRequest>): Promise<Loan> {
  return runCommand(pool, request, LOAN, input, requires(LOAN), async (access) => {
    const workspaceId = access.workspace.id;
    await requireBorrower(access, input.borrowerId);
    if (input.dueOn && input.dueOn < todayIn(access.workspace.timeZone)) {
      throw new AppError('VALIDATION_FAILED', 'La fecha de devolución no puede ser anterior a hoy');
    }
    const ctx = inventoryContext(access);
    const ordered = byPosition(input.lines);
    const positions = new Map<string, LockedPosition>();
    for (const { positionId } of ordered) positions.set(positionId, await lockExistingPosition(ctx, positionId));

    const classes = await loanableClasses.run({ workspaceId, positionIds: ordered.map((line) => line.positionId) }, access.client);
    if (classes.length !== ordered.length || classes.some((row) => row.class !== 'reusable_counted')) {
      throw new AppError('VALIDATION_FAILED', 'Solo se prestan materiales reutilizables por cantidad');
    }

    // El número correlativo se asigna con el bloqueo del espacio, después de las posiciones: todos los vales siguen ese orden.
    await lockKey(access.client, `materials.loans/${workspaceId}`);
    const [next] = await nextLoanNumber.run({ workspaceId }, access.client);
    if (!next) throw new Error('El número del préstamo no devolvió fila');
    const { number } = next;
    const [created] = await insertLoan.run(
      { workspaceId, number, borrowerId: input.borrowerId, principalId: access.principalId, dueOn: input.dueOn ?? null, notes: input.notes ?? null },
      access.client,
    );
    if (!created) throw new Error('El préstamo no devolvió fila');
    for (const [index, line] of input.lines.entries()) {
      await insertLoanLine.run({ workspaceId, loanId: created.id, line: index + 1, positionId: line.positionId, quantity: line.quantity }, access.client);
      await holdForLoan(ctx, positions.get(line.positionId)!, line.quantity);
    }
    await recordAudit(access, {
      action: LOAN,
      entityType: 'materials.loan',
      entityId: created.id,
      changes: { code: loanCode(number), borrowerId: input.borrowerId, dueOn: input.dueOn ?? null, lines: input.lines },
    });
    return loanById(access, created.id);
  });
}

/**
 * Recibe una devolución, total o parcial. Cada línea dice cuánto volvió bien, dañado y perdido, sin superar lo que
 * falta. Resuelve un pendiente (ADR 0009): se admite también con el módulo solo para resolver. El vale se cierra
 * cuando no falta nada; el que dos personas devuelvan a la vez lo resuelve la versión esperada.
 */
export function returnMaterial(
  pool: pg.Pool,
  request: CommandRequest,
  loanId: string,
  input: z.infer<typeof returnRequest>,
): Promise<Loan> {
  return runCommand(
    pool,
    request,
    RETURN,
    { loanId, ...input },
    requires(RETURN),
    async (access) => {
      const workspaceId = access.workspace.id;
      const [loan] = await lockLoan.run({ workspaceId, loanId }, access.client);
      if (!loan) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
      if (loan.version !== input.expectedVersion) throw new AppError('VERSION_CONFLICT', 'El préstamo cambió: vuelve a cargarlo');
      if (loan.status === 'closed') throw new AppError('VALIDATION_FAILED', 'El préstamo ya está cerrado');

      const lines = new Map((await loanLinesOf.run({ workspaceId, loanId }, access.client)).map((line) => [line.line, line]));
      const returns = input.lines.map((entry) => {
        const line = lines.get(entry.line);
        if (!line) throw new AppError('VALIDATION_FAILED', `El préstamo no tiene la línea ${entry.line}`);
        const total = sumDecimals([entry.good, entry.damaged, entry.lost]);
        if (compareDecimals(total, line.outstanding) > 0) {
          throw new AppError('VALIDATION_FAILED', `La línea ${entry.line} solo tiene ${line.outstanding} por devolver`);
        }
        return { ...entry, id: line.id, positionId: line.position_id, total };
      });

      const ctx = inventoryContext(access);
      const positions = new Map<string, LockedPosition>();
      for (const { positionId } of byPosition(returns)) {
        if (!positions.has(positionId)) positions.set(positionId, await lockExistingPosition(ctx, positionId));
      }

      const code = loanCode(loan.number);
      for (const entry of returns) {
        const position = positions.get(entry.positionId)!;
        await releaseLoanHold(ctx, entry.positionId, entry.total);
        const writeOff = async (outcome: 'damaged' | 'lost', quantity: string, label: string) => {
          const result = await applyMovement(ctx, position, {
            type: 'adjustment',
            quantity: `-${quantity}`,
            unit: position.baseUnit,
            reason: `${label} en el préstamo ${code}`,
            reference: code,
          });
          await insertReturnLine.run(
            { workspaceId, lineId: entry.id, outcome, quantity, note: entry.note ?? null, principalId: access.principalId, operationId: result.operationId },
            access.client,
          );
        };
        if (positive(entry.good)) {
          await insertReturnLine.run(
            { workspaceId, lineId: entry.id, outcome: 'good', quantity: entry.good, note: entry.note ?? null, principalId: access.principalId, operationId: null },
            access.client,
          );
        }
        if (positive(entry.damaged)) await writeOff('damaged', entry.damaged, 'Dañado');
        if (positive(entry.lost)) await writeOff('lost', entry.lost, 'Perdido');
        await applyLineReturn.run(
          { workspaceId, lineId: entry.id, good: entry.good, damaged: entry.damaged, lost: entry.lost },
          access.client,
        );
      }
      const [advanced] = await advanceLoan.run({ workspaceId, loanId }, access.client);
      if (!advanced) throw new Error('El préstamo no devolvió fila');
      await recordAudit(access, {
        action: RETURN,
        entityType: 'materials.loan',
        entityId: loanId,
        changes: {
          code,
          status: advanced.status,
          lines: returns.map(({ line, good, damaged, lost }) => ({ line, good, damaged, lost, outstandingAfter: subtractDecimals(lines.get(line)!.outstanding, sumDecimals([good, damaged, lost])) })),
        },
      });
      return loanById(access, loanId);
    },
    'resolve_pending',
  );
}
