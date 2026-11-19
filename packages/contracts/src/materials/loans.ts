import { z } from 'zod';
import { list, page, text } from '../common.js';
import { compareDecimals, decimalString, nonNegativeQuantity, positiveQuantity } from '../decimal.js';

// ---------------------------------------------------------------------------
// Préstamos de material (ADR 0025): vale, líneas y devoluciones parciales
// ---------------------------------------------------------------------------

const MAX_LOAN_LINES = 50;

const lendLine = z.object({ positionId: z.uuid(), quantity: positiveQuantity }).strict();

/**
 * POST /loans: presta material a un miembro del espacio. Cada línea sale de una posición con lo disponible
 * suficiente; `dueOn` es la fecha civil de devolución prevista y no puede ser anterior a hoy.
 */
export const lendRequest = z
  .object({
    borrowerId: z.uuid(),
    dueOn: z.iso.date().optional(),
    notes: text(500).optional(),
    lines: z.array(lendLine).min(1).max(MAX_LOAN_LINES),
  })
  .strict()
  .refine((value) => new Set(value.lines.map((line) => line.positionId)).size === value.lines.length, {
    message: 'Cada posición va una vez en el vale',
    path: ['lines'],
  });

const returnLine = z
  .object({
    line: z.number().int().positive(),
    good: nonNegativeQuantity.default('0'),
    damaged: nonNegativeQuantity.default('0'),
    lost: nonNegativeQuantity.default('0'),
    note: text(500).optional(),
  })
  .strict()
  .refine((value) => [value.good, value.damaged, value.lost].some((quantity) => compareDecimals(quantity, '0') > 0), {
    message: 'Indica cuánto volvió, quedó dañado o se perdió',
  });

/**
 * POST /loans/:loanId/returns: una devolución, total o parcial. Lo dañado y lo perdido dan de baja con un ajuste
 * del libro; lo que vuelve bien queda disponible. `expectedVersion` es la del vale que la persona vio.
 */
export const returnRequest = z
  .object({
    expectedVersion: z.number().int().positive(),
    lines: z.array(returnLine).min(1).max(MAX_LOAN_LINES),
  })
  .strict()
  .refine((value) => new Set(value.lines.map((line) => line.line)).size === value.lines.length, {
    message: 'Cada línea va una vez en la devolución',
    path: ['lines'],
  });

export const loanParams = z.object({ workspaceId: z.uuid(), loanId: z.uuid() });

/** `overdue`: abiertos con la fecha prevista ya vencida, en la fecha civil del espacio. */
export const loanFilter = z.enum(['open', 'overdue', 'closed']);
/** Sin filtro, todos los vales. `q` busca por número (P-0043 o 43), prestatario o material (nombre o código). */
export const loanListQuery = z
  .object({ ...page, filter: loanFilter.optional(), borrowerId: z.uuid().optional(), q: z.string().trim().min(2).max(100).optional() })
  .strict();

const person = z.object({ id: z.uuid(), name: z.string() });

const loanLine = z.object({
  line: z.number().int().positive(),
  positionId: z.uuid(),
  productId: z.uuid(),
  productCode: z.string(),
  productName: z.string(),
  unit: z.string(),
  quantity: decimalString,
  returned: decimalString,
  damaged: decimalString,
  lost: decimalString,
  /** Lo que aún falta devolver: lo prestado menos lo devuelto, dañado y perdido. */
  outstanding: decimalString,
});

const loanSummary = z.object({
  id: z.uuid(),
  number: z.number().int().positive(),
  /** Código legible del vale: P-0001. */
  code: z.string(),
  /** Con sus roles vigentes en el espacio, solo para mostrarlos (ADR 0011). */
  borrower: person.extend({ roles: z.array(z.string()) }),
  lentBy: person,
  lentAt: z.iso.datetime({ offset: true }),
  dueOn: z.iso.date().nullable(),
  status: z.enum(['open', 'closed']),
  /** Abierto con la fecha prevista vencida; se calcula al consultar. */
  overdue: z.boolean(),
  /** Hubo material dañado o perdido: queda como deuda registrada, sin bloqueo (ADR 0025). */
  hasDebt: z.boolean(),
  lineCount: z.number().int().nonnegative(),
  outstandingLines: z.number().int().nonnegative(),
  /** Piezas del vale (un reutilizable se cuenta en piezas): prestadas y las que aún faltan por devolver. */
  pieces: z.object({ lent: decimalString, outstanding: decimalString }),
  closedAt: z.iso.datetime({ offset: true }).nullable(),
});
export const loanList = list(loanSummary);

/** Ficha del vale: además, sus notas, su versión y sus líneas. */
export const loan = loanSummary.extend({
  notes: z.string().nullable(),
  version: z.number().int().positive(),
  lines: z.array(loanLine),
});

export type LoanSummary = z.infer<typeof loanSummary>;
export type LoanList = z.infer<typeof loanList>;
export type Loan = z.infer<typeof loan>;
export type LoanLine = z.infer<typeof loanLine>;
