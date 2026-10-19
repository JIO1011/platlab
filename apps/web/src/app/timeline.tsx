import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Un hecho de la línea de tiempo de un equipo (M-01d), de Equipos o de otro módulo, ya dicho en palabras: la
 * ficha y la hoja de vida lo pintan igual sin saber de qué módulo viene.
 */
export interface TimelineEntry {
  key: string;
  /** El día civil del hecho en la zona del espacio, AAAA-MM-DD. */
  day: string;
  /** El instante, si se sabe; sin él se dice solo el día (un trabajo dice en qué día se hizo, no a qué hora). */
  at: string | null;
  icon: LucideIcon;
  title: ReactNode;
  details: ReactNode;
  /** Quién lo hizo o lo registró; null si no se sabe. */
  actor: string | null;
  /** Un registro anulado: sigue a la vista, marcado. */
  voided?: boolean;
}

/** Una línea que explica un hecho: «Motivo: Se cayó al moverla», con el rótulo en tinta. */
export function TimelineDetail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="break-words text-[13px] text-ink-muted">
      <span className="font-medium text-ink">{label}</span> {children}
    </p>
  );
}

/** Lo que un módulo entrega a la línea de tiempo: cargando, el error con su reintento, o sus hechos. */
export type TimelineSource =
  | { status: 'pending' }
  | { status: 'error'; error: unknown; retry: () => void }
  | { status: 'success'; entries: TimelineEntry[]; hasMore: boolean };

/**
 * Varias fuentes como una: falla si alguna falla (reintenta las que fallaron), carga mientras alguna cargue y,
 * si no, reúne sus hechos. `hasMore`: alguna llegó al límite de lo que se muestra.
 */
export function combineSources(sources: TimelineSource[]): TimelineSource {
  const failed = sources.filter((source) => source.status === 'error');
  if (failed.length > 0) {
    return { status: 'error', error: failed[0]!.error, retry: () => failed.forEach((source) => source.retry()) };
  }
  if (sources.some((source) => source.status === 'pending')) return { status: 'pending' };
  const done = sources.filter((source) => source.status === 'success');
  return { status: 'success', entries: done.flatMap((source) => source.entries), hasMore: done.some((source) => source.hasMore) };
}

/**
 * Del más reciente al más antiguo: por día y, dentro del mismo día, los que tienen hora primero, de la más tarde
 * a la más temprana; los que solo tienen día van al final de su día.
 */
export function newestFirst(entries: readonly TimelineEntry[]): TimelineEntry[] {
  return [...entries].sort((a, b) => b.day.localeCompare(a.day) || (b.at ?? '').localeCompare(a.at ?? ''));
}
