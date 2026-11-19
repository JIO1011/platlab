import { z } from 'zod';
import { decimalString } from '../decimal.js';
import { materialClass } from './catalog.js';

/** GET /dashboard: el tablero del Resumen (ADR 0025). `days` es el periodo; por omisión, 30. */
const dashboardPeriod = z.union([z.literal(7), z.literal(30), z.literal(90)]);
export const materialsDashboardQuery = z
  .object({ days: z.coerce.number().pipe(dashboardPeriod).default(30) })
  .strict();

/** Una cifra del periodo contra el periodo anterior de la misma duración: cuentas, nunca cantidades de unidades distintas. */
const periodCount = z.object({ current: z.number().int().nonnegative(), previous: z.number().int().nonnegative() });

/** Un material con su cifra de uso, en su propia unidad: de salidas (insumo) o de unidades prestadas (reutilizable). */
const usage = z.object({
  productId: z.uuid(),
  name: z.string(),
  baseUnit: z.string(),
  /** Salidas (insumo) o vales (reutilizable) del periodo. */
  events: z.number().int().nonnegative(),
  quantity: decimalString,
});

export const materialsDashboard = z.object({
  days: dashboardPeriod,
  figures: z.object({
    issues: periodCount,
    loans: periodCount,
    /** Registros de devolución con daño o pérdida. */
    writtenOff: periodCount,
    openLoans: z.number().int().nonnegative(),
    overdueLoans: z.number().int().nonnegative(),
    belowMinimum: z.number().int().nonnegative(),
  }),
  /** Las últimas 8 semanas: cada una con la fecha de su lunes y cuántos ingresos, salidas y vales hubo. */
  weekly: z.array(z.object({ week: z.iso.date(), received: z.number().int(), issued: z.number().int(), lent: z.number().int() })),
  topSupplies: z.array(usage),
  topReusables: z.array(usage),
  /** Insumos que se acaban pronto: existencia entre el consumo diario de 30 días. */
  runningLow: z.array(
    z.object({ productId: z.uuid(), name: z.string(), baseUnit: z.string(), balance: decimalString, dailyUse: decimalString, daysLeft: z.number().int().nonnegative() }),
  ),
  /** Reutilizables por cantidad: lo que hay en el estante y lo que posee el espacio. */
  shelf: z.object({ available: decimalString, total: decimalString }),
  byClass: z.array(z.object({ class: materialClass, materials: z.number().int().nonnegative() })),
  /** Solo para quien administra el catálogo; para los demás, `null`. */
  topBorrowers: z
    .array(z.object({ name: z.string(), loans: z.number().int(), units: decimalString, lastAt: z.iso.datetime({ offset: true }) }))
    .nullable(),
  attention: z.object({
    overdue: z.array(z.object({ loanId: z.uuid(), code: z.string(), borrowerName: z.string(), dueOn: z.iso.date() })),
    belowMinimum: z.array(z.object({ productId: z.uuid(), name: z.string(), baseUnit: z.string(), balance: decimalString, minimum: decimalString })),
    /** Los lotes con saldo que vencen primero (vencidos incluidos), hasta EXPIRY_WATCH_DAYS días (MA-01f). */
    expiring: z.array(
      z.object({ productId: z.uuid(), name: z.string(), baseUnit: z.string(), lot: z.string().nullable(), expiresOn: z.iso.date(), balance: decimalString }),
    ),
  }),
});

export type DashboardPeriod = z.infer<typeof dashboardPeriod>;
export type MaterialsDashboard = z.infer<typeof materialsDashboard>;
