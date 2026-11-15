import type pg from 'pg';
import {
  isoWeekday,
  scheduleCheck,
  sumDecimals,
  timeText,
  toMinutes,
  type CheckRequest,
  type RequestCheck,
  type RequestLine,
  type RequestLineInput,
  type RequestReview,
  type WeeklyHours,
} from '@platlab/contracts';
import { todayIn } from '../../../platform/dates.js';
import { AppError } from '../../../platform/errors.js';
import { hasPermission, type QueryRequest, type WorkspaceAccess } from '../../core/index.js';
import { operationalAssetsOfTypes } from '../../equipment/index.js';
import { reagentStockByArea } from '../../reagents/index.js';
import { listRequests } from '../infrastructure/requests.queries.js';
import { scheduleContext } from '../infrastructure/schedule.queries.js';
import { busyOn, freeIn, neededOf, type Busy } from './availability.js';
import { REQUEST_CREATE, runQuery } from './command.js';
import { checkedLines, pendingOf, visibleRequest, type LineRow } from './request-view.js';

/**
 * Revisión antes de enviar (ADR 0023, «Flujo de la Propuesta» y «Disponibilidad y recursos»): contra todo el espacio,
 * como la reserva real, y sin apartar nada. Usa las piezas de la regla única (`availability.ts`), así que dice lo mismo
 * que la marca de cada línea, con el desglose por fecha, por área y las alternativas. Solo informa: enviar sigue
 * validando lo suyo. Las líneas «sin verificar» no se revisan.
 */

/** Sin laboratorio pedido, las alternativas de un equipo se buscan en el día de la tabla del Cronograma. */
const DEFAULT_DAY = [{ opens: '07:00', closes: '19:00' }];
const STEP_MINUTES = 30;
const MAX_ALTERNATIVES = 3;

/** Lo que se revisa, guardado o por guardar: sus líneas ya marcadas por la regla y solo sus fechas pendientes. */
interface Draft {
  areaId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  participants: number | null;
  pending: readonly string[];
  lines: readonly RequestLine[];
}

/** Otras franjas del día, de la misma duración y cada media hora dentro de `ranges`, con al menos `wanted` equipos libres. */
function freeAlternatives(
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
      if (timeText(from) === slot.startsAt) continue;
      if (freeIn(assetIds, busy, from, from + duration) >= wanted) result.push({ startsAt: timeText(from), endsAt: timeText(from + duration) });
    }
  }
  return result;
}

async function reviewDate(
  access: WorkspaceAccess,
  draft: Draft,
  date: string,
  assets: Awaited<ReturnType<typeof operationalAssetsOfTypes>>,
): Promise<RequestReview['dates'][number]> {
  const slot = draft.startsAt && draft.endsAt ? { date, startsAt: draft.startsAt, endsAt: draft.endsAt } : null;
  const [context] = draft.areaId && slot ? await scheduleContext.run({ workspaceId: access.workspace.id, areaId: draft.areaId, date, exceptId: null }, access.client) : [];
  const weeklyHours = context?.weekly_hours as WeeklyHours | undefined;
  const area =
    context && slot
      ? (() => {
          const check = scheduleCheck(slot, {
            today: todayIn(access.workspace.timeZone),
            participants: draft.participants ?? 0,
            space: { capacity: context.capacity, weeklyHours: weeklyHours! },
            periods: context.periods as Array<{ startsOn: string; endsOn: string }>,
            closures: context.closures as Array<{ startsOn: string; endsOn: string }>,
            others: context.others as Array<{ startsAt: string; endsAt: string }>,
          });
          return { name: context.area_name, problems: [...check.blocking, ...check.warnings] };
        })()
      : null;
  const equipmentLines = draft.lines.flatMap((line, index) =>
    line.kind === 'equipment' && line.assetTypeId && line.check !== 'unverified' ? [{ index, typeId: line.assetTypeId, name: line.name, wanted: line.quantity }] : [],
  );
  if (!slot || equipmentLines.length === 0) return { date, area, equipment: [] };
  const busy = await busyOn(access, assets.map((asset) => asset.id), date);
  const ranges = weeklyHours?.[String(isoWeekday(date)) as keyof WeeklyHours] ?? DEFAULT_DAY;
  const equipment = equipmentLines.map(({ index, typeId, name, wanted }) => {
    const ofType = assets.filter((asset) => asset.typeId === typeId).map((asset) => asset.id);
    const free = freeIn(ofType, busy, toMinutes(slot.startsAt), toMinutes(slot.endsAt));
    return { line: index, name, wanted, free, alternatives: free >= wanted ? [] : freeAlternatives(ranges, slot, ofType, busy, wanted) };
  });
  return { date, area, equipment };
}

async function reviewOf(access: WorkspaceAccess, draft: Draft): Promise<RequestReview> {
  const { pending } = draft;
  const reagentLines = draft.lines.flatMap((line, index) =>
    line.kind === 'reagent' && line.itemId && line.check !== 'unverified' ? [{ index, itemId: line.itemId, name: line.name, unit: line.unit, quantity: line.quantity }] : [],
  );
  const typeIds = draft.lines.flatMap((line) => (line.kind === 'equipment' && line.assetTypeId && line.check !== 'unverified' ? [line.assetTypeId] : []));
  const assets = await operationalAssetsOfTypes(access, [...new Set(typeIds)]);
  const dates: RequestReview['dates'] = [];
  for (const date of pending) dates.push(await reviewDate(access, draft, date, assets));
  // El último día es el más exigente: lo que vence antes ya no sirve. Lo pedido es por fecha.
  const lastDate = pending.at(-1);
  if (!lastDate) return { dates, reagents: [] };
  const stock = await reagentStockByArea(access, [...new Set(reagentLines.map((line) => line.itemId))], lastDate);
  const reagents = reagentLines.map(({ index, itemId, name, unit, quantity }) => {
    const areas = stock.filter((row) => row.itemId === itemId).map((row) => ({ name: row.areaName, available: row.available }));
    return { line: index, name, unit, needed: neededOf(quantity, pending.length), available: sumDecimals(areas.map((area) => area.available)), areas };
  });
  return { dates, reagents };
}

export function reviewRequest(pool: pg.Pool, request: QueryRequest, requestId: string): Promise<RequestReview> {
  return runQuery(pool, request, async (access) => {
    const current = await visibleRequest(access, requestId);
    return reviewOf(access, { ...current, pending: pendingOf(current.dates, current.scheduledDates) });
  });
}

/** Una línea por guardar con la forma de una guardada: con «por grupo», el total es por grupo × grupos, como al guardar. */
function lineRow(line: RequestLineInput, index: number, groups: number): LineRow {
  const base = { line: index + 1, kind: line.kind, description: line.description, item_id: null, asset_type_id: null, per_group: null, unit: null };
  if (line.kind === 'reagent') return { ...base, item_id: line.itemId, quantity: line.quantity, unit: line.unit };
  const perGroup = line.perGroup === null ? null : String(line.perGroup);
  const quantity = perGroup === null ? String(line.quantity) : sumDecimals(Array.from({ length: groups }, () => perGroup));
  return { ...base, asset_type_id: line.kind === 'equipment' ? line.assetTypeId : null, quantity, per_group: perGroup };
}

/**
 * La consulta de lo que quien pide está llenando, sin guardarlo (ADR 0023, «Disponibilidad y recursos»): cada línea con
 * su marca y la revisión, con la misma regla que lo guardado. Solo sobre una solicitud propia; las fechas ya programadas
 * no cuentan. No guarda ni aparta nada.
 */
export function checkRequest(pool: pg.Pool, request: QueryRequest, requestId: string, input: CheckRequest): Promise<RequestCheck> {
  return runQuery(pool, request, async (access) => {
    if (!(await hasPermission(access, REQUEST_CREATE))) throw new AppError('ACCESS_DENIED', 'No tienes permiso para esta acción');
    const [row] = await listRequests.run({ workspaceId: access.workspace.id, requestId, requesterId: null }, access.client);
    if (!row || row.requester_principal_id !== access.principalId) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
    const pending = pendingOf(input.dates, row.scheduled_dates);
    const draft = { pending, startsAt: input.startsAt, endsAt: input.endsAt, lines: input.lines.map((line, index) => lineRow(line, index, input.groups)) };
    const [lines = []] = await checkedLines(access, [draft]);
    return { lines, review: await reviewOf(access, { ...input, pending, lines }) };
  });
}
