import type pg from 'pg';
import type { z } from 'zod';
import type { Loan, LoanList, LoanSummary, loanListQuery } from '@platlab/contracts';
import { AppError } from '../../../platform/errors.js';
import { decodeCursor, encodeCursor } from '../../../platform/http/cursor.js';
import { listActiveMembers, type WorkspaceAccess } from '../../core/index.js';
import { listLoanLines, listLoans, type IListLoansResult } from '../infrastructure/loans.queries.js';
import { runQuery, type QueryRequest } from './command.js';

/** Vistas de los préstamos: vales con su estado calculado y sus líneas. */

/** Código legible del vale: P-0001. */
export const loanCode = (number: number) => `P-${String(number).padStart(4, '0')}`;

const toSummary = (row: IListLoansResult): LoanSummary => ({
  id: row.id,
  number: row.number,
  code: loanCode(row.number),
  borrower: { id: row.borrower_id, name: row.borrower_name },
  lentBy: { id: row.lent_by_id, name: row.lent_by_name },
  lentAt: row.lent_at.toISOString(),
  dueOn: row.due_on,
  status: row.status as LoanSummary['status'],
  overdue: row.overdue,
  hasDebt: row.has_debt,
  lineCount: row.line_count,
  outstandingLines: row.outstanding_lines,
  closedAt: row.closed_at?.toISOString() ?? null,
});

const page = (access: WorkspaceAccess, params: { loanId?: string; borrowerId?: string; filter?: string; beforeNumber?: number; limit: number }) =>
  listLoans.run(
    {
      workspaceId: access.workspace.id,
      loanId: params.loanId ?? null,
      borrowerId: params.borrowerId ?? null,
      filter: params.filter ?? null,
      beforeNumber: params.beforeNumber ?? null,
      timeZone: access.workspace.timeZone,
      limit: params.limit,
    },
    access.client,
  );

/** La ficha de un vale con sus líneas; la usan la consulta y los comandos al responder. */
export async function loanById(access: WorkspaceAccess, loanId: string): Promise<Loan> {
  const [row] = await page(access, { loanId, limit: 1 });
  if (!row) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
  const lines = await listLoanLines.run({ workspaceId: access.workspace.id, loanId }, access.client);
  return {
    ...toSummary(row),
    notes: row.notes,
    version: row.version,
    lines: lines.map((line) => ({
      line: line.line,
      positionId: line.position_id,
      productId: line.product_id,
      productCode: line.product_code,
      productName: line.product_name,
      unit: line.unit,
      quantity: line.quantity,
      returned: line.returned,
      damaged: line.damaged,
      lost: line.lost,
      outstanding: line.outstanding,
    })),
  };
}

export function getLoan(pool: pg.Pool, request: QueryRequest, loanId: string): Promise<Loan> {
  return runQuery(pool, request, (access) => loanById(access, loanId));
}

/** Los vales del espacio, del más nuevo al más viejo, con el filtro de estado y el prestatario. */
export function listLoanPage(pool: pg.Pool, request: QueryRequest, query: z.infer<typeof loanListQuery>): Promise<LoanList> {
  return runQuery(pool, request, async (access) => {
    const before = decodeCursor(query.cursor, 1);
    const rows = await page(access, {
      ...(query.borrowerId ? { borrowerId: query.borrowerId } : {}),
      ...(query.filter ? { filter: query.filter } : {}),
      ...(before ? { beforeNumber: Number(before[0]) } : {}),
      limit: query.limit + 1,
    });
    const visible = rows.slice(0, query.limit);
    const last = visible.at(-1);
    return {
      items: visible.map(toSummary),
      nextCursor: rows.length > query.limit && last ? encodeCursor([String(last.number)]) : null,
    };
  });
}

/** A quién se puede prestar: los miembros activos del espacio. */
export function listBorrowers(pool: pg.Pool, request: QueryRequest) {
  return runQuery(pool, request, async (access) => ({ items: await listActiveMembers(access) }));
}
