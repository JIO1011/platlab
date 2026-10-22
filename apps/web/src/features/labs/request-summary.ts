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

/** Qué recibidas muestra la lista: las que esperan respuesta o todas. */
export type InboxFilter = 'submitted' | 'all';

export const inboxFilters = [
  { value: 'submitted', label: 'Enviadas' },
  { value: 'all', label: 'Todas' },
] as const;

/** Las recibidas del filtro, en el orden que dio el servidor (lo urgente primero). */
export const filterInbox = (items: readonly RequestSummary[], filter: InboxFilter): RequestSummary[] =>
  filter === 'all' ? [...items] : items.filter((item) => item.status === 'submitted');
