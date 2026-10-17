import { Button, Skeleton, cn } from '@platlab/ui';
import { ArrowLeft, Printer } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { initialSelection } from './selection';

/** Una etiqueta de la hoja: su código (lo que se lee junto a la casilla) y la etiqueta ya dibujada. */
interface LabelItem {
  id: string;
  code: string;
  label: ReactNode;
}

/**
 * Hoja de selección e impresión de etiquetas QR (ADR 0012, entrega 4; ADR 0019, E-01d), común a Reactivos y
 * Equipos: todas elegidas salvo que llegue una preselección. En pantalla se elige cuáles; al imprimir solo
 * salen las elegidas, sin el resto de la app.
 */
export function LabelSheet({
  items,
  loading,
  preselected,
  back,
  hint,
  empty,
}: {
  items: readonly LabelItem[];
  /** Mientras llegan las etiquetas. */
  loading: boolean;
  /** Los ids elegidos de entrada; `null`, todos. */
  preselected: readonly string[] | null;
  /** El enlace de regreso; sin él, quien la usa pone su propio «Volver». */
  back?: { to: string; label: string } | undefined;
  hint: string;
  /** Lo que se dice si no hay ninguna etiqueta. */
  empty: string;
}) {
  const [chosen, setChosen] = useState<Set<string> | null>(null);
  const selected =
    chosen ??
    initialSelection(
      items.map((item) => item.id),
      preselected,
    );
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChosen(next);
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold text-ink">Etiquetas</h2>
        {back ? (
          <Link to={back.to} className="inline-flex items-center gap-1 rounded-control text-sm font-medium text-action hover:text-action-hover">
            <ArrowLeft className="size-4" aria-hidden />
            {back.label}
          </Link>
        ) : null}
        <p className="text-sm text-ink-muted" aria-live="polite">
          {selected.size === 1 ? '1 etiqueta elegida' : `${selected.size} etiquetas elegidas`} de {items.length}
        </p>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setChosen(new Set(items.map((item) => item.id)))}>
            Elegir todas
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setChosen(new Set())}>
            Ninguna
          </Button>
          <Button variant="primary" disabled={selected.size === 0} onClick={() => window.print()}>
            <Printer aria-hidden />
            Imprimir
          </Button>
        </div>
      </div>
      <p className="text-sm text-ink-muted">{hint}</p>
      {loading ? (
        <Skeleton className="h-[33.9mm] w-[63.5mm] rounded-card" />
      ) : items.length === 0 ? (
        <p className="rounded-panel bg-surface px-4 py-8 text-center text-sm text-ink-muted shadow-raised">{empty}</p>
      ) : (
        // En papel, la retícula de la hoja adhesiva: 3 columnas de 63,5 mm con 2,5 mm entre ellas y filas
        // de 33,9 mm sin hueco (los márgenes los fija `@page` en styles.css).
        <ul
          className="print-area grid grid-cols-[repeat(auto-fill,63.5mm)] gap-[4mm] print:grid-cols-[repeat(3,63.5mm)] print:gap-x-[2.5mm] print:gap-y-0"
          aria-label="Etiquetas"
        >
          {items.map((item) => {
            const isSelected = selected.has(item.id);
            return (
              <li key={item.id} className={cn('grid gap-1.5 break-inside-avoid print:gap-0', !isSelected && 'print:hidden')}>
                <label className="grid grid-cols-[auto_1fr] items-center gap-x-2 text-sm text-ink print:hidden">
                  <input type="checkbox" className="size-4 accent-[var(--color-action)]" checked={isSelected} onChange={() => toggle(item.id)} />
                  <span className="whitespace-nowrap tabular-nums">{item.code}</span>
                  {/* Línea reservada en todas: elegir o no una etiqueta no desalinea la fila. */}
                  <span className="col-start-2 min-h-5 text-[13px] text-ink-muted">{isSelected ? '' : 'No se imprime'}</span>
                </label>
                {/* La elegida lleva un anillo en el acento (solo en pantalla); el texto dice si se imprime. */}
                <div className={cn('w-fit rounded-[2mm] print:ring-0', isSelected && 'ring-2 ring-action ring-offset-2')}>{item.label}</div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
