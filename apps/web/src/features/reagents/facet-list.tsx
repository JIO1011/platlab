/**
 * Lista de casillas de un grupo plegable del panel de filtros de Movimientos (R-01C, ADR 0014):
 * buscador, las opciones con más movimientos y «Ver más». Cada cambio escribe la URL desde quien la usa.
 */
import { Input, OptionRow } from '@platlab/ui';
import { useState } from 'react';
import { fold } from '../../app/fold';
import { countFormat } from './movement-text';

export interface FacetOption {
  key: string;
  label: string;
  count: number;
}

/** Cuántas opciones se ven al abrir el grupo y cuántas suma cada «Ver más»: las de más movimientos. */
const STEP = 5;

/**
 * Lista de casillas como el filtro de Excel: lo elegido sube arriba, después las opciones con más
 * movimientos de 5 en 5, y un buscador. La cuenta de cada opción ignora lo marcado en su propio grupo,
 * así que se pueden sumar opciones sin que se vacíen. Los nombres largos se recortan en una línea (el
 * nombre completo queda en el título) y la cifra nunca se corta.
 */
export function FacetList({
  name,
  options,
  selected,
  onToggle,
  search,
  loading = false,
}: {
  name: string;
  options: readonly FacetOption[];
  selected: readonly string[];
  onToggle: (key: string) => void;
  /** Búsqueda que resuelve quien llama (el servidor, con muchos reactivos); sin ella, se filtra aquí. */
  search?: { value: string; onChange: (value: string) => void; label: string };
  loading?: boolean;
}) {
  const [shown, setShown] = useState(STEP);
  const [typed, setTyped] = useState('');
  // Lo marcado sube arriba solo al montarse la lista (abrir el grupo, recargar, abrir el cajón),
  // nunca al marcar: la fila no debe saltar bajo el puntero.
  const [pinned] = useState(selected);
  const text = search ? search.value : typed;
  const needle = fold(text.trim());
  // Con búsqueda externa, `options` ya viene filtrado; sin ella, se filtra aquí sin perder lo marcado.
  const matching = search || needle === '' ? options : options.filter((option) => selected.includes(option.key) || fold(option.label).includes(needle));
  const ordered = [...matching.filter((option) => pinned.includes(option.key)), ...matching.filter((option) => !pinned.includes(option.key))];
  const chosen = ordered.filter((option) => pinned.includes(option.key)).length;
  const limit = Math.max(shown, chosen);
  const visible = ordered.slice(0, limit);
  const label = search?.label ?? `Buscar ${name}`;
  return (
    <div className="grid gap-1">
      <Input
        type="search"
        value={text}
        onChange={(event) => (search ? search.onChange(event.target.value) : setTyped(event.target.value))}
        aria-label={label}
        placeholder="Buscar"
        className="mb-1 h-[44px] sm:h-9"
      />
      {loading ? (
        <p className="px-2 py-1.5 text-[13px] text-ink-subtle">Cargando opciones…</p>
      ) : visible.length === 0 ? (
        <p className="px-2 py-1.5 text-[13px] text-ink-subtle">{needle ? 'Sin coincidencias.' : 'Sin opciones con estos filtros.'}</p>
      ) : (
        <div>
          {visible.map((option) => (
            <OptionRow
              key={option.key}
              name={name}
              checked={selected.includes(option.key)}
              onChange={() => onToggle(option.key)}
              count={
                <>
                  {countFormat.format(option.count)}
                  <span className="sr-only"> movimientos</span>
                </>
              }
            >
              <span className="block truncate" title={option.label}>
                {option.label}
              </span>
            </OptionRow>
          ))}
        </div>
      )}
      {ordered.length > limit ? (
        <button
          type="button"
          onClick={() => setShown(limit + STEP)}
          className="min-h-[44px] rounded-control px-2 text-left text-[13px] font-medium text-action transition-colors hover:bg-action-soft sm:min-h-8"
        >
          Ver más
        </button>
      ) : null}
    </div>
  );
}
