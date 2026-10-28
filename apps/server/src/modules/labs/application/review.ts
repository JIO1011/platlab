import type pg from 'pg';
import { isoWeekday, scheduleCheck, sumDecimals, timeText, toMinutes, type RequestReview, type WeeklyHours } from '@platlab/contracts';
import { todayIn } from '../../../platform/dates.js';
import type { QueryRequest, WorkspaceAccess } from '../../core/index.js';
import { operationalAssetsOfTypes } from '../../equipment/index.js';
import { reagentStockByArea } from '../../reagents/index.js';
import { assetBookingsOn } from '../infrastructure/holds.queries.js';
import { scheduleContext } from '../infrastructure/schedule.queries.js';
import { runQuery } from './command.js';
import { visibleRequest } from './requests.js';

/**
 * Revisión antes de enviar (ADR 0023, «Flujo de la Propuesta»): contra todo el espacio, como la reserva real, y sin
 * apartar nada. Solo informa: enviar sigue validando lo suyo. Los reactivos y equipos que su módulo no deja consultar
 * (línea «sin verificar») no se revisan.
 */

/** Sin laboratorio pedido, las alternativas de un equipo se buscan en el día de la tabla del Cronograma. */
const DEFAULT_DAY = [{ opens: '07:00', closes: '19:00' }];
const STEP_MINUTES = 30;
const MAX_ALTERNATIVES = 3;

interface Busy {
  assetId: string;
  from: number;
  to: number;
}

/**
 * Otras franjas del día, de la misma duración y cada media hora dentro de `ranges`, con al menos `wanted` equipos sin
 * nada apartado que se cruce. `[inicio, fin)`: una franja empieza cuando otra termina.
 */
export function freeAlternatives(
  ranges: ReadonlyArray<{ opens: string; closes: string }>,
  slot: { startsAt: string; endsAt: string },
  assetIds: readonly string[],
  busy: readonly Busy[],
  wanted: number,
): Array<{ startsAt: string; endsAt: string }> {
  const duration = toMinutes(slot.endsAt) - toMinutes(slot.startsAt);
  const result: Array<{ startsAt: string; endsAt: string }> = [];
  for (const range of ranges) {
    for (let from = toMinutes(range.opens); from + duration <= toMinutes(range.closes); from += STEP_MINUTES) {
      if (result.length === MAX_ALTERNATIVES) return result;
      const to = from + duration;
      if (timeText(from) === slot.startsAt) continue;
      const free = assetIds.filter((id) => !busy.some((item) => item.assetId === id && item.from < to && from < item.to)).length;
      if (free >= wanted) result.push({ startsAt: timeText(from), endsAt: timeText(to) });
    }
  }
  return result;
}

async function reviewDate(
  access: WorkspaceAccess,
  current: Awaited<ReturnType<typeof visibleRequest>>,
  date: string,
  assets: Awaited<ReturnType<typeof operationalAssetsOfTypes>>,
): Promise<RequestReview['dates'][number]> {
  const workspaceId = access.workspace.id;
  const slot = current.startsAt && current.endsAt ? { date, startsAt: current.startsAt, endsAt: current.endsAt } : null;
  const [context] = current.areaId && slot ? await scheduleContext.run({ workspaceId, areaId: current.areaId, date, exceptId: null }, access.client) : [];
  const weeklyHours = context?.weekly_hours as WeeklyHours | undefined;
  const area =
    context && slot
      ? (() => {
          const check = scheduleCheck(slot, {
            today: todayIn(access.workspace.timeZone),
            participants: current.participants ?? 0,
            space: { capacity: context.capacity, weeklyHours: weeklyHours! },
            periods: context.periods as Array<{ startsOn: string; endsOn: string }>,
            closures: context.closures as Array<{ startsOn: string; endsOn: string }>,
            others: context.others as Array<{ startsAt: string; endsAt: string }>,
          });
          return { name: context.area_name, problems: [...check.blocking, ...check.warnings] };
        })()
      : null;
  const equipmentLines = current.lines.flatMap((line, index) =>
    line.kind === 'equipment' && line.assetTypeId && line.check !== 'unverified' ? [{ index, typeId: line.assetTypeId, name: line.name, wanted: line.quantity }] : [],
  );
  if (!slot || equipmentLines.length === 0) return { date, area, equipment: [] };
  const bookings = await assetBookingsOn.run({ workspaceId, assetIds: assets.map((asset) => asset.id), date }, access.client);
  const busy = bookings.map((row) => ({ assetId: row.asset_id, from: toMinutes(row.starts_at), to: toMinutes(row.ends_at) }));
  const ranges = weeklyHours?.[String(isoWeekday(date)) as keyof WeeklyHours] ?? DEFAULT_DAY;
  const [from, to] = [toMinutes(slot.startsAt), toMinutes(slot.endsAt)];
  const equipment = equipmentLines.map(({ index, typeId, name, wanted }) => {
    const ofType = assets.filter((asset) => asset.typeId === typeId).map((asset) => asset.id);
    const free = ofType.filter((id) => !busy.some((item) => item.assetId === id && item.from < to && from < item.to)).length;
    return { line: index, name, wanted, free, alternatives: free >= wanted ? [] : freeAlternatives(ranges, slot, ofType, busy, wanted) };
  });
  return { date, area, equipment };
}

export function reviewRequest(pool: pg.Pool, request: QueryRequest, requestId: string): Promise<RequestReview> {
  return runQuery(pool, request, async (access) => {
    const current = await visibleRequest(access, requestId);
    const dates = current.dates.filter((date) => !current.scheduledDates.includes(date));
    const reagentLines = current.lines.flatMap((line, index) =>
      line.kind === 'reagent' && line.itemId && line.check !== 'unverified' ? [{ index, itemId: line.itemId, name: line.name, unit: line.unit, quantity: line.quantity }] : [],
    );
    const typeIds = current.lines.flatMap((line) => (line.kind === 'equipment' && line.assetTypeId && line.check !== 'unverified' ? [line.assetTypeId] : []));
    const assets = await operationalAssetsOfTypes(access, [...new Set(typeIds)]);
    const reviewed: RequestReview['dates'] = [];
    for (const date of dates) reviewed.push(await reviewDate(access, current, date, assets));
    // El último día es el más exigente: lo que vence antes ya no sirve. Lo pedido es por fecha.
    const lastDate = dates.at(-1);
    if (!lastDate) return { dates: reviewed, reagents: [] };
    const stock = await reagentStockByArea(access, [...new Set(reagentLines.map((line) => line.itemId))], lastDate);
    const reagents = reagentLines.map(({ index, itemId, name, unit, quantity }) => {
      const areas = stock.filter((row) => row.itemId === itemId).map((row) => ({ name: row.areaName, available: row.available }));
      return { line: index, name, unit, needed: sumDecimals(dates.map(() => quantity)), available: sumDecimals(areas.map((area) => area.available)), areas };
    });
    return { dates: reviewed, reagents };
  });
}
