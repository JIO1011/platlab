import { compareDecimals, sumDecimals, toMinutes, type RequestLine } from '@platlab/contracts';
import { todayIn } from '../../../platform/dates.js';
import { moduleAdmits, type WorkspaceAccess } from '../../core/index.js';
import { operationalAssetsOfTypes } from '../../equipment/index.js';
import { reagentStockByArea } from '../../reagents/index.js';
import { assetBookingsOn } from '../infrastructure/holds.queries.js';
import type { IRequestLinesResult } from '../infrastructure/requests.queries.js';

/**
 * La regla única de «cuánto hay» de Laboratorios (ADR 0023, «Disponibilidad y recursos»). La usan el buscador, la marca
 * de cada línea, la cuenta «Con recursos por revisar», la revisión antes de enviar y la consulta del borrador sin guardar,
 * para que ninguna diga otra cosa. Nada se aparta.
 *
 * - Reactivo: saldo − reservado de los lotes vigentes el día que cuenta (la última fecha pendiente; sin fechas, hoy) y de
 *   lugares activos, frente a lo pedido por fecha × las fechas pendientes (al menos una).
 * - Equipo: los operativos del tipo libres en la franja, el peor día pendiente; sin fecha u horario, los operativos.
 * - Con todas sus fechas programadas, la marca sale de lo apartado (`held`).
 * - Material, no catalogado o sin el módulo dueño admitido para consultar: «sin verificar».
 */

type Check = RequestLine['check'];

/** Lo que la regla necesita de una línea: su número (desde 1), su tipo, lo del catálogo y lo pedido por fecha. */
type AskLine = Pick<IRequestLinesResult, 'line' | 'kind' | 'item_id' | 'asset_type_id' | 'quantity'>;

/** Lo que la regla necesita de una solicitud: sus fechas aún sin programar (en orden), su franja y sus líneas. */
export interface Ask {
  pending: readonly string[];
  startsAt: string | null;
  endsAt: string | null;
  lines: readonly AskLine[];
  /** Con todas sus fechas programadas: si lo apartado de cada línea alcanza, en todos sus bloques. */
  held?: ReadonlyMap<number, boolean> | undefined;
}

/** La marca de una línea y lo que hay: cadena decimal en reactivos, número de equipos en equipos; nulo si no se cuenta. */
interface Finding {
  check: Check;
  available: string | null;
}

/** Una franja apartada de un equipo, en minutos del día. */
export interface Busy {
  assetId: string;
  from: number;
  to: number;
}

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

/** El día cuyo vencimiento cuenta: lo que vence antes de la última fecha pendiente ya no sirve; sin fechas, hoy. */
export const validOnOf = (pending: readonly string[], today: string): string => pending.at(-1) ?? today;

/** Lo pedido en todas las fechas pendientes: lo de una fecha × las fechas, al menos una. Exacto. */
export const neededOf = (quantity: string, pending: number): string => sumDecimals(Array.from({ length: Math.max(1, pending) }, () => quantity));

/** Los equipos sin nada apartado que se cruce con `[from, to)`: una franja empieza cuando otra termina. */
export const freeIn = (assetIds: readonly string[], busy: readonly Busy[], from: number, to: number): number =>
  assetIds.filter((id) => !busy.some((item) => item.assetId === id && item.from < to && from < item.to)).length;

/** Lo apartado ese día de esos equipos. */
export async function busyOn(access: WorkspaceAccess, assetIds: readonly string[], date: string): Promise<Busy[]> {
  if (assetIds.length === 0) return [];
  const rows = await assetBookingsOn.run({ workspaceId: access.workspace.id, assetIds: [...assetIds], date }, access.client);
  return rows.map((row) => ({ assetId: row.asset_id, from: toMinutes(row.starts_at), to: toMinutes(row.ends_at) }));
}

/** Lo libre de cada reactivo el día `validOn`, sumadas sus áreas: lo mismo que la revisión desglosa por área. */
export async function reagentsFreeOn(access: WorkspaceAccess, itemIds: readonly string[], validOn: string): Promise<Map<string, string>> {
  const free = new Map<string, string>();
  for (const row of await reagentStockByArea(access, unique(itemIds), validOn)) free.set(row.itemId, sumDecimals([free.get(row.itemId) ?? '0', row.available]));
  return free;
}

/** La marca y lo que hay de cada línea de cada solicitud, en lote: una consulta por día que cuenta, no por solicitud. */
export async function findingsOf(access: WorkspaceAccess, asks: readonly Ask[]): Promise<Finding[][]> {
  const today = todayIn(access.workspace.timeZone);
  const lines = asks.flatMap((ask) => ask.lines);
  const itemIds = unique(lines.flatMap((line) => (line.kind === 'reagent' && line.item_id ? [line.item_id] : [])));
  const typeIds = unique(lines.flatMap((line) => (line.kind === 'equipment' && line.asset_type_id ? [line.asset_type_id] : [])));
  const [reagentsOn, equipmentOn] = await Promise.all([
    itemIds.length > 0 ? moduleAdmits(access, 'reagents', 'read_export') : false,
    typeIds.length > 0 ? moduleAdmits(access, 'equipment', 'read_export') : false,
  ]);
  const counted = asks.filter((ask) => !ask.held);

  // Reactivos: lo libre de cada uno el día que cuenta.
  const wanted = new Map<string, string[]>();
  if (reagentsOn) {
    for (const ask of counted) {
      const day = validOnOf(ask.pending, today);
      wanted.set(day, [...(wanted.get(day) ?? []), ...ask.lines.flatMap((line) => (line.kind === 'reagent' && line.item_id ? [line.item_id] : []))]);
    }
  }
  const free = new Map<string, Map<string, string>>();
  for (const [day, ids] of wanted) free.set(day, await reagentsFreeOn(access, ids, day));

  // Equipos: los operativos de cada tipo y lo apartado cada día pendiente con franja.
  const assets = equipmentOn ? await operationalAssetsOfTypes(access, typeIds) : [];
  const slotted = counted.filter((ask) => ask.startsAt && ask.endsAt && ask.lines.some((line) => line.kind === 'equipment' && line.asset_type_id));
  const busy = new Map<string, Busy[]>();
  for (const day of unique(slotted.flatMap((ask) => ask.pending))) busy.set(day, await busyOn(access, assets.map((asset) => asset.id), day));

  return asks.map((ask) =>
    ask.lines.map((line): Finding => {
      const reagent = line.kind === 'reagent' && line.item_id !== null && reagentsOn;
      const equipment = line.kind === 'equipment' && line.asset_type_id !== null && equipmentOn;
      if (!reagent && !equipment) return { check: 'unverified', available: null };
      if (ask.held) return { check: ask.held.get(line.line) ? 'ok' : 'short', available: null };
      if (reagent) {
        const available = free.get(validOnOf(ask.pending, today))?.get(line.item_id!) ?? '0';
        return { check: compareDecimals(available, neededOf(line.quantity, ask.pending.length)) >= 0 ? 'ok' : 'short', available };
      }
      const ofType = assets.filter((asset) => asset.typeId === line.asset_type_id).map((asset) => asset.id);
      const slot = ask.startsAt && ask.endsAt ? { from: toMinutes(ask.startsAt), to: toMinutes(ask.endsAt) } : null;
      // El peor día pendiente decide; sin fecha u horario, cuentan los operativos.
      const available = slot && ask.pending.length > 0 ? Math.min(...ask.pending.map((day) => freeIn(ofType, busy.get(day) ?? [], slot.from, slot.to))) : ofType.length;
      return { check: available >= Number(line.quantity) ? 'ok' : 'short', available: String(available) };
    }),
  );
}
