import { compareDecimals, type RequestCheck, type RequestOptions } from '@platlab/contracts';
import { Button, Quantity, Segmented, cn } from '@platlab/ui';
import { Check, Plus, Search } from 'lucide-react';
import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { fold } from '../../app/fold';
import type { DraftLine } from './request-draft';

/**
 * El catálogo del panel «Recursos» (ADR 0023, «Disponibilidad y recursos»): se ve sin escribir, para saber qué hay; el
 * buscador lo filtra por nombre o código y Enter agrega el primero. Cada fila dice lo libre para las fechas y el horario
 * que se están llenando (la consulta sin guardar); mientras se comprueba, lo dice, sin suponer el stock. Lo que no está se
 * agrega «sin catálogo» desde la última fila; los materiales no se inventarían y se escriben.
 */

type Kind = DraftLine['kind'];

/** Lo que se agrega al pedido desde el catálogo o escrito. */
export type NewResource =
  | { kind: 'reagent'; itemId: string | null; name: string; unit: string }
  | { kind: 'equipment'; assetTypeId: string | null; name: string }
  | { kind: 'material'; name: string };

interface Entry {
  id: string;
  name: string;
  code: string | null;
  unit: string;
}

export interface CatalogProps {
  /** Las columnas de Recursos del formato, en su orden, con su nombre en la hoja. */
  kinds: ReadonlyArray<{ kind: Kind; label: string }>;
  options: RequestOptions | undefined;
  /** Lo libre para las fechas y el horario de ahora; `null` mientras se comprueba. */
  catalog: RequestCheck['catalog'] | null;
  /** Hay fechas y horario: los equipos se cuentan libres en la franja; si no, operativos. */
  slotted: boolean;
  /** Lo del catálogo que ya está en el pedido. */
  chosen: ReadonlySet<string>;
  /** El pedido llegó al máximo de líneas. */
  full: boolean;
  onAdd: (resource: NewResource) => void;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Lo libre de una fila: cantidad con unidad en reactivos, equipos libres en la franja u operativos. */
function freeText(kind: Kind, entry: Entry, { catalog, slotted }: CatalogProps): { text: ReactNode; none: boolean } {
  if (!catalog) return { text: 'Comprobando…', none: false };
  if (kind === 'reagent') {
    const free = catalog.reagents.find((reagent) => reagent.id === entry.id)?.available ?? '0';
    return compareDecimals(free, '0') <= 0 ? { text: 'Sin stock libre', none: true } : { text: <><Quantity value={free} unit={entry.unit} /> libres</>, none: false };
  }
  const free = catalog.equipmentTypes.find((type) => type.id === entry.id)?.available ?? 0;
  if (slotted) return { text: free === 0 ? 'Ninguno libre en tu horario' : `${plural(free, 'libre', 'libres')} en tu horario`, none: free === 0 };
  return { text: free === 0 ? 'Ninguno operativo' : plural(free, 'operativo', 'operativos'), none: free === 0 };
}

export function CatalogPane(props: CatalogProps) {
  const { kinds, options, chosen, full, onAdd } = props;
  const listId = useId();
  const [kind, setKind] = useState<Kind>(kinds[0]?.kind ?? 'reagent');
  const [query, setQuery] = useState('');
  const typed = query.trim();
  const enabled = kind === 'reagent' ? (options?.reagentsEnabled ?? false) : kind === 'equipment' ? (options?.equipmentEnabled ?? false) : false;

  const entries = useMemo((): Entry[] => {
    if (kind === 'reagent') return (options?.reagents ?? []).map((reagent) => ({ id: reagent.id, name: reagent.name, code: reagent.code, unit: reagent.unit }));
    if (kind === 'equipment') return (options?.equipmentTypes ?? []).map((type) => ({ id: type.id, name: type.name, code: null, unit: '' }));
    return [];
  }, [kind, options]);
  const needle = fold(typed);
  const matches = needle === '' ? entries : entries.filter((entry) => fold(`${entry.name} ${entry.code ?? ''}`).includes(needle));

  const add = (entry: Entry) => {
    if (kind === 'reagent') onAdd({ kind, itemId: entry.id, name: entry.name, unit: entry.unit });
    else if (kind === 'equipment') onAdd({ kind, assetTypeId: entry.id, name: entry.name });
  };
  const addTyped = () => {
    if (typed === '') return;
    onAdd(kind === 'reagent' ? { kind, itemId: null, name: typed, unit: '' } : kind === 'equipment' ? { kind, assetTypeId: null, name: typed } : { kind, name: typed });
    setQuery('');
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || full) return;
    event.preventDefault();
    const first = matches.find((entry) => !chosen.has(entry.id));
    if (first) add(first);
    else addTyped();
  };

  const counts: Record<Kind, number | null> = {
    reagent: options?.reagentsEnabled ? options.reagents.length : null,
    equipment: options?.equipmentEnabled ? options.equipmentTypes.length : null,
    material: null,
  };
  const label = kinds.find((entry) => entry.kind === kind)?.label ?? '';

  return (
    <div className="grid gap-3">
      {kinds.length > 1 ? (
        <Segmented
          label="Qué agregar"
          value={kind}
          options={kinds.map((entry) => ({ value: entry.kind, label: counts[entry.kind] === null ? entry.label : `${entry.label} (${counts[entry.kind]})` }))}
          onValueChange={(next) => setKind(next)}
          className="max-w-full self-start overflow-x-auto"
        />
      ) : null}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
        <input
          type="search"
          aria-label={kind === 'material' ? 'Material que necesitas' : `Buscar en ${label}`}
          aria-controls={listId}
          autoComplete="off"
          spellCheck={false}
          placeholder={kind === 'material' ? 'Escribe el material, por ejemplo Pipeta de 10 mL' : enabled ? 'Busca por nombre o código' : 'Escribe el nombre'}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          className="h-12 w-full rounded-control border border-line-strong bg-surface pl-10 pr-3 text-[15px] text-ink placeholder:text-ink-subtle transition-[border-color,box-shadow] duration-150 hover:border-ink-subtle focus-visible:border-action focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action/20"
        />
      </div>
      {kind === 'material' ? <p className="text-[13px] text-ink-muted">Los materiales no se inventarían: escribe qué necesitas y agrégalo.</p> : null}
      {kind !== 'material' && !enabled ? (
        <p className="text-[13px] text-ink-muted">{label} no está habilitado en este espacio: escribe el nombre y pídelo sin catálogo.</p>
      ) : null}
      {full ? <p className="text-[13px] text-warning">Llegaste al máximo de líneas de una solicitud.</p> : null}
      <p className="sr-only" aria-live="polite">
        {kind === 'material' || !enabled ? '' : plural(matches.length, 'resultado', 'resultados')}
      </p>
      <ul id={listId} className="-mx-2 max-h-[26rem] overflow-y-auto overscroll-contain">
        {matches.map((entry) => {
          const free = freeText(kind, entry, props);
          const added = chosen.has(entry.id);
          return (
            <li key={entry.id} className="flex items-center gap-3 rounded-[10px] px-2 py-2.5 transition-colors hover:bg-surface-sunken">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium text-ink">{entry.name}</p>
                <p className={cn('text-[13px] tabular-nums', free.none ? 'text-warning' : 'text-ink-muted')}>
                  {entry.code ? <span className="text-ink-subtle">{entry.code} · </span> : null}
                  {free.text}
                </p>
              </div>
              {added ? (
                <span className="flex shrink-0 items-center gap-1 px-2 text-[13px] font-medium text-ink-muted">
                  <Check className="size-4" aria-hidden />
                  En tu pedido
                </span>
              ) : (
                <Button size="sm" className="max-sm:h-11 shrink-0" disabled={full} aria-label={`Agregar ${entry.name}`} onClick={() => add(entry)}>
                  <Plus aria-hidden />
                  Agregar
                </Button>
              )}
            </li>
          );
        })}
        {enabled && matches.length === 0 && typed !== '' ? <li className="px-2 py-2 text-[13px] text-ink-muted">No hay «{typed}» en el catálogo.</li> : null}
        {typed !== '' ? (
          <li className="px-2 pt-2">
            <Button variant="ghost" size="sm" className="h-auto min-h-9 w-full justify-start whitespace-normal py-1.5 text-left text-action max-sm:min-h-11" disabled={full} onClick={addTyped}>
              <Plus aria-hidden />
              {kind === 'material' ? `Agregar «${typed}»` : `Agregar «${typed}» sin catálogo`}
            </Button>
          </li>
        ) : null}
      </ul>
      {enabled && typed === '' ? <p className="text-[13px] text-ink-subtle">¿No está en la lista? Escribe su nombre para pedirlo sin catálogo.</p> : null}
    </div>
  );
}
