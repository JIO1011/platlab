import type pg from 'pg';
import type { z } from 'zod';
import type { MaterialClass, materialsDashboardQuery, MaterialsDashboard } from '@platlab/contracts';
import { hasPermission, type WorkspaceAccess } from '../../core/index.js';
import {
  dashboardBelowMinimum,
  dashboardBorrowers,
  dashboardByClass,
  dashboardExpiring,
  dashboardFigures,
  dashboardOverdue,
  dashboardRunningLow,
  dashboardShelf,
  dashboardTopReusables,
  dashboardTopSupplies,
  dashboardWeekly,
} from '../infrastructure/dashboard.queries.js';
import { loanCode } from './loan-views.js';
import { CATALOG, runQuery, type QueryRequest } from './command.js';
import { expiringBy, summaryOf } from './queries.js';

/** Cuántas filas lleva cada lista de «Hay que atender» en el Resumen. */
const ATTENTION_ROWS = 3;

/**
 * El tablero del Resumen (ADR 0025): todas las lecturas en una sola transacción de consulta, así que las cifras
 * concuerdan entre sí. El ranking de quién presta más solo se arma para quien administra el catálogo.
 */
async function dashboardOf(access: WorkspaceAccess, days: MaterialsDashboard['days']): Promise<MaterialsDashboard> {
  const workspaceId = access.workspace.id;
  const timeZone = access.workspace.timeZone;
  const run = access.client;
  const [figures] = await dashboardFigures.run({ workspaceId, days }, run);
  const [shelf] = await dashboardShelf.run({ workspaceId }, run);
  if (!figures || !shelf) throw new Error('El tablero de Materiales no devolvió fila');
  const summary = await summaryOf(access);
  const weekly = await dashboardWeekly.run({ workspaceId, timeZone }, run);
  const supplies = await dashboardTopSupplies.run({ workspaceId, days }, run);
  const reusables = await dashboardTopReusables.run({ workspaceId, days }, run);
  const runningLow = await dashboardRunningLow.run({ workspaceId }, run);
  const byClass = await dashboardByClass.run({ workspaceId }, run);
  const overdue = await dashboardOverdue.run({ workspaceId, timeZone, limit: ATTENTION_ROWS }, run);
  const belowMinimum = await dashboardBelowMinimum.run({ workspaceId, limit: ATTENTION_ROWS }, run);
  const expiring = await dashboardExpiring.run({ workspaceId, expiringBy: expiringBy(access), limit: ATTENTION_ROWS }, run);
  const borrowers = (await hasPermission(access, CATALOG)) ? await dashboardBorrowers.run({ workspaceId, days }, run) : null;

  const usage = (row: { id: string; name: string; base_unit: string; events: number; quantity: string }) => ({
    productId: row.id,
    name: row.name,
    baseUnit: row.base_unit,
    events: row.events,
    quantity: row.quantity,
  });
  return {
    days,
    figures: {
      issues: { current: figures.issues_current, previous: figures.issues_previous },
      loans: { current: figures.loans_current, previous: figures.loans_previous },
      writtenOff: { current: figures.written_off_current, previous: figures.written_off_previous },
      openLoans: summary.openLoans,
      overdueLoans: summary.overdueLoans,
      belowMinimum: summary.belowMinimum,
    },
    weekly: weekly.map((row) => ({ week: row.week, received: row.received, issued: row.issued, lent: row.lent })),
    topSupplies: supplies.map(usage),
    topReusables: reusables.map(usage),
    runningLow: runningLow.map((row) => ({
      productId: row.id,
      name: row.name,
      baseUnit: row.base_unit,
      balance: row.balance,
      dailyUse: row.daily_use,
      daysLeft: row.days_left,
    })),
    shelf: { available: shelf.available, total: shelf.total },
    byClass: byClass.map((row) => ({ class: row.class as MaterialClass, materials: row.materials })),
    topBorrowers: borrowers?.map((row) => ({ name: row.name, loans: row.loans, units: row.units, lastAt: row.last_at.toISOString() })) ?? null,
    attention: {
      overdue: overdue.map((row) => ({ loanId: row.id, code: loanCode(row.number), borrowerName: row.borrower_name, dueOn: row.due_on })),
      belowMinimum: belowMinimum.map((row) => ({ productId: row.id, name: row.name, baseUnit: row.base_unit, balance: row.balance, minimum: row.minimum })),
      expiring: expiring.map((row) => ({
        productId: row.id,
        name: row.name,
        baseUnit: row.base_unit,
        lot: row.lot,
        expiresOn: row.expires_on,
        balance: row.balance,
      })),
    },
  };
}

export const getDashboard = (pool: pg.Pool, request: QueryRequest, query: z.infer<typeof materialsDashboardQuery>): Promise<MaterialsDashboard> =>
  runQuery(pool, request, (access) => dashboardOf(access, query.days));
