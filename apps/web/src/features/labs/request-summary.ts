import type { RequestSummary } from '@platlab/contracts';
import { fold } from '../../app/fold';
import { countText, formatDate } from '../../app/format';

/** La primera fecha de la solicitud y, si hay más, cuántas; «Sin fecha» mientras no lleva ninguna. */
export const firstDateText = ({ firstDate, dateCount }: Pick<RequestSummary, 'firstDate' | 'dateCount'>): string =>
  firstDate ? `${formatDate(firstDate)}${dateCount > 1 ? ` (+${dateCount - 1} más)` : ''}` : 'Sin fecha';

/** Las líneas de recursos con ⚠ o ✖ que quien revisa aún debe mirar; `null` si no hay ninguna. */
export const exceptionsText = (exceptions: number): string | null => {
  if (exceptions <= 0) return null;
  return exceptions === 1 ? '1 recurso por revisar' : `${exceptions} recursos por revisar`;
};

/** El código de práctica de la solicitud («P1-S11-FIS01»: el del primer bloque) y, si tiene más bloques, «+N»; `null` mientras no está programada. */
export const practiceCodeText = (blockCodes: readonly string[]): { code: string; more: string | null } | null => {
  const [code] = blockCodes;
  return code === undefined ? null : { code, more: blockCodes.length > 1 ? `+${blockCodes.length - 1}` : null };
};

/** El mismo código en una línea de texto («P1-S11-FIS01 +2»), para la casilla «Código» de la planilla; `null` sin bloques. */
export const practiceCodeLabel = (blockCodes: readonly string[]): string | null => {
  const practice = practiceCodeText(blockCodes);
  if (!practice) return null;
  return practice.more ? `${practice.code} ${practice.more}` : practice.code;
};

/**
 * Qué recibidas muestra la lista: las que esperan respuesta, las que entraron fuera de plazo, las que traen recursos
 * por revisar, las que esperan cambios del solicitante, o todas. Las cifras de arriba son estos filtros.
 */
export type InboxFilter = 'submitted' | 'late' | 'resources' | 'changes' | 'all';

/** Si la solicitud cuenta en el filtro; fuera de plazo y recursos solo cuentan mientras esperan respuesta. */
const inboxMatches = (item: RequestSummary, filter: InboxFilter): boolean => {
  switch (filter) {
    case 'submitted':
      return item.status === 'submitted';
    case 'late':
      return item.status === 'submitted' && item.late;
    case 'resources':
      return item.status === 'submitted' && item.exceptions > 0;
    case 'changes':
      return item.status === 'changes_requested';
    case 'all':
      return true;
  }
};

/** Las recibidas del filtro, en el orden que dio el servidor (lo urgente primero). */
export const filterInbox = (items: readonly RequestSummary[], filter: InboxFilter): RequestSummary[] =>
  items.filter((item) => inboxMatches(item, filter));

/** Cuántas recibidas cuenta cada cifra y cada pestaña de arriba; coincide con lo que muestra su filtro. */
export const inboxCounts = (items: readonly RequestSummary[]): Record<InboxFilter, number> => ({
  all: items.length,
  submitted: filterInbox(items, 'submitted').length,
  late: filterInbox(items, 'late').length,
  resources: filterInbox(items, 'resources').length,
  changes: filterInbox(items, 'changes').length,
});

/** El filtro con que abre Recibidas: lo que espera respuesta si hay algo; si no, todas. */
export const initialInboxFilter = (items: readonly RequestSummary[]): InboxFilter => (filterInbox(items, 'submitted').length > 0 ? 'submitted' : 'all');

/** Las recibidas cuyo código, título o solicitante contienen lo escrito, sin distinguir mayúsculas ni tildes; sin nada escrito, todas. */
export const searchInbox = (items: readonly RequestSummary[], query: string): RequestSummary[] => {
  const wanted = fold(query.trim());
  if (wanted === '') return [...items];
  return items.filter((item) => [item.code, item.title ?? '', item.requesterName].some((text) => fold(text).includes(wanted)));
};

/** Cuándo es una solicitud en la tabla de Recibidas: la primera fecha, su horario y cuántas fechas más trae. */
export interface WhenText {
  date: string;
  time: string | null;
  more: string | null;
}

export const whenText = ({ firstDate, dateCount, startsAt, endsAt }: Pick<RequestSummary, 'firstDate' | 'dateCount' | 'startsAt' | 'endsAt'>): WhenText => ({
  date: firstDate ? formatDate(firstDate) : 'Sin fecha',
  time: startsAt && endsAt ? `${startsAt}–${endsAt}` : null,
  more: dateCount > 1 ? `+${countText(dateCount - 1, 'fecha', 'fechas')}` : null,
});

/** Las solicitudes propias según lo que la persona debe hacer, cada grupo en el orden del servidor. */
export interface MineGroups {
  /** Con cambios solicitados: esperan a quien las pidió. */
  attention: RequestSummary[];
  drafts: RequestSummary[];
  /** Enviadas: esperan respuesta del laboratorio. */
  sent: RequestSummary[];
  /** Rechazadas y canceladas: ya no se mueven. */
  closed: RequestSummary[];
}

export const groupMine = (items: readonly RequestSummary[]): MineGroups => ({
  attention: items.filter((item) => item.status === 'changes_requested'),
  drafts: items.filter((item) => item.status === 'draft'),
  sent: items.filter((item) => item.status === 'submitted'),
  closed: items.filter((item) => item.status === 'rejected' || item.status === 'cancelled'),
});
