import { Input, OptionRow } from '@platlab/ui';
import { useState } from 'react';
import { countFormat } from './movement-text';

export interface FacetOption {
  key: string;
  label: string;
  /** Dato que distingue opciones parecidas (el código del reactivo), atenuado. */
  detail?: string;
  count: number;
}

/** Cuántas opciones se ven antes de «Ver todos»: las de más movimientos. */
const TOP_OPTIONS = 8;

/**
 * Lista de casillas como el filtro de Excel (R-01C): lo elegido sube arriba, después las opciones con
 * más movimientos y «Ver todos (n)»; con buscador cuando la lista puede ser larga. La cuenta de cada
 * opción ignora lo marcado en su propio grupo, así que se pueden sumar opciones sin que se vacíen.
 */
export function FacetList({
  name,
  options,
  selected,
  onToggle,
  search,
  loading = false,
  fixedOrder = false,
}: {
  name: string;
  options: readonly FacetOption[];
  selected: readonly string[];
  onToggle: (key: string) => void;
  /** Con buscador: el texto escrito y quién lo cambia. La búsqueda la resuelve quien llama. */
  search?: { value: string; onChange: (value: string) => void; label: string };
  loading?: boolean;
  /** Orden de `options` tal cual, sin subir lo marcado (Tipo: son cuatro y no deben saltar). */
  fixedOrder?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  // Lo marcado sube arriba solo al montarse la lista (abrir el grupo, recargar, abrir el cajón),
  // nunca al marcar: la fila no debe saltar bajo el puntero.
  const [pinned] = useState(selected);
  const chosen = fixedOrder ? [] : options.filter((option) => pinned.includes(option.key));
  const rest = fixedOrder ? options : options.filter((option) => !pinned.includes(option.key));
  const ordered = [...chosen, ...rest];
  const searching = Boolean(search?.value.trim());
  const limit = expanded || searching || fixedOrder ? ordered.length : Math.max(TOP_OPTIONS, chosen.length);
  const visible = ordered.slice(0, limit);
  const scrolls = visible.length > TOP_OPTIONS;
  return (
    <div className="grid gap-1">
      {search ? (
        <Input
          type="search"
          value={search.value}
          onChange={(event) => search.onChange(event.target.value)}
          aria-label={search.label}
          placeholder="Buscar"
          className="mb-1 h-[44px] sm:h-9"
        />
      ) : null}
      {loading ? (
        <p className="px-2 py-1.5 text-[13px] text-ink-subtle">Cargando opciones…</p>
      ) : visible.length === 0 ? (
        <p className="px-2 py-1.5 text-[13px] text-ink-subtle">{searching ? 'Sin coincidencias.' : 'Sin opciones con estos filtros.'}</p>
      ) : (
        <div className={scrolls ? 'max-h-72 overflow-y-auto overscroll-contain' : undefined}>
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
              {option.label}
              {option.detail ? <span className="ml-1.5 whitespace-nowrap text-[13px] text-ink-subtle">{option.detail}</span> : null}
            </OptionRow>
          ))}
        </div>
      )}
      {!searching && !fixedOrder && ordered.length > TOP_OPTIONS ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="min-h-[44px] rounded-control px-2 text-left text-[13px] font-medium text-action transition-colors hover:bg-action-soft sm:min-h-8"
        >
          {expanded ? 'Ver menos' : `Ver todos (${countFormat.format(ordered.length)})`}
        </button>
      ) : null}
    </div>
  );
}
