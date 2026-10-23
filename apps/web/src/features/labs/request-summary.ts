import type { RequestSummary } from '@platlab/contracts';
import { formatDate } from '../../app/format';

/** La primera fecha de la solicitud y, si hay más, cuántas; «Sin fecha» mientras no lleva ninguna. */
export const firstDateText = ({ firstDate, dateCount }: Pick<RequestSummary, 'firstDate' | 'dateCount'>): string =>
  firstDate ? `${formatDate(firstDate)}${dateCount > 1 ? ` (+${dateCount - 1} más)` : ''}` : 'Sin fecha';

/** Las líneas de recursos con ⚠ o ✖ que quien revisa aún debe mirar; `null` si no hay ninguna. */
export const exceptionsText = (exceptions: number): string | null => {
  if (exceptions <= 0) return null;
  return exceptions === 1 ? '1 recurso por revisar' : `${exceptions} recursos por revisar`;
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

/** Cuántas recibidas cuenta cada cifra de arriba; coincide con lo que muestra su filtro. */
export const inboxCounts = (items: readonly RequestSummary[]): Record<Exclude<InboxFilter, 'all'>, number> => ({
  submitted: filterInbox(items, 'submitted').length,
  late: filterInbox(items, 'late').length,
  resources: filterInbox(items, 'resources').length,
  changes: filterInbox(items, 'changes').length,
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
