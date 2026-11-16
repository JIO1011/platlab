import { compareDecimals, type RequestCheck, type RequestOptions } from '@platlab/contracts';
import { Popover, PopoverAnchor, PopoverContent, Sheet, StockLevelBar, cn, formatDecimal, ratioPercent } from '@platlab/ui';
import { Check, FlaskConical, Microscope, Plus, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { fold } from '../../app/fold';
import { useMediaQuery } from '../../app/use-media-query';
import { WrapShadow, bare, wrapped } from './request-cells';

/**
 * La celda de Reactivos o de Equipos de la planilla al llenar (ADR 0023, «Disponibilidad y recursos»): es el buscador.
 * Al hacer clic o escribir abre, junto a la cantidad, la lista del catálogo con lo libre para las fechas y el horario que
 * se están llenando, la cifra destacada: en reactivos, «**1.575** de 1.580 g libres» con su barra y lo apartado (lo
 * vencido no cuenta); en equipos, «**2** de 3 libres en tu horario». Lo agotado va al final. Lo que se escribe en la
 * celda o en la lupa de la lista filtra por nombre o código; ↑ ↓ y Enter eligen, Esc cierra y deja la celda como estaba.
 * Lo que no está se pide «sin catálogo» desde la última fila. En el móvil, la lista sale desde abajo. Mientras se
 * comprueba, no se supone el stock.
 */

export interface CatalogEntry {
  id: string;
  name: string;
  code: string | null;
  /** La unidad base del reactivo; vacía en equipos. */
  unit: string;
}

type Kind = 'reagent' | 'equipment';

export interface PickerProps {
  kind: Kind;
  /** Nombre accesible de la celda, con su fila. */
  label: string;
  /** Lo que la celda dice cuando no se está buscando: el nombre de la línea, o vacío. */
  value: string;
  /** Lo del catálogo que ya pide esta línea. */
  selectedId: string | null;
  options: RequestOptions | undefined;
  /** Lo libre para las fechas y el horario de ahora; `null` mientras se comprueba. */
  catalog: RequestCheck['catalog'] | null;
  slotted: boolean;
  /** Para cuándo se cuenta lo libre, en una frase; vacía sin fechas. */
  scope: string;
  /** Lo del catálogo que ya piden otras líneas: no se repite. */
  taken: ReadonlySet<string>;
  invalid: boolean;
  /** La celda junto a la que se abre la lista (la cantidad de esa fila). */
  anchor: RefObject<HTMLElement | null>;
  onPick: (entry: CatalogEntry) => void;
  onFree: (name: string) => void;
}

type Choice = { type: 'entry'; entry: CatalogEntry; taken: boolean } | { type: 'free'; name: string };

const NOUNS = {
  reagent: { one: 'reactivo', many: 'reactivos', placeholder: 'Buscar reactivo', title: 'Elegir reactivo', icon: FlaskConical },
  equipment: { one: 'equipo', many: 'equipos', placeholder: 'Buscar equipo', title: 'Elegir equipo', icon: Microscope },
} as const;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

interface Free {
  /** La cifra destacada (lo libre); vacía sin stock o sin operativos. */
  count: string;
  /** Lo que sigue a la cifra («de 1.580 g libres») o, sin cifra, todo el texto («Sin stock»). */
  text: string;
  /** La barra de lo libre sobre el saldo vigente: solo en reactivos con saldo. */
  bar: { percent: number; hasStock: boolean } | null;
  note: string | null;
  /** Nada libre: en ámbar y al final de la lista. */
  none: boolean;
}

const freeLabel = (free: Free) => `${free.count} ${free.text}`.trim();

/** Lo libre de una fila de la lista: la cifra, su texto y, en reactivos, la barra y lo apartado. */
function freeOf(kind: Kind, entry: CatalogEntry, catalog: RequestCheck['catalog'], slotted: boolean): Free {
  if (kind === 'reagent') {
    const row = catalog.reagents.find((reagent) => reagent.id === entry.id);
    const [available, stock, held] = [row?.available ?? '0', row?.stock ?? '0', row?.held ?? '0'];
    if (compareDecimals(stock, '0') <= 0) return { count: '', text: 'Sin stock', bar: null, note: null, none: true };
    const free = compareDecimals(available, '0') > 0;
    return {
      count: formatDecimal(available),
      text: `de ${formatDecimal(stock)} ${entry.unit} libres`,
      bar: { percent: ratioPercent(available, stock) ?? 0, hasStock: free },
      note: compareDecimals(held, '0') > 0 ? `${formatDecimal(held)} ${entry.unit} apartados` : null,
      none: !free,
    };
  }
  const row = catalog.equipmentTypes.find((type) => type.id === entry.id);
  const [available, total] = [row?.available ?? 0, row?.total ?? 0];
  if (total === 0) return { count: '', text: 'Ninguno operativo', bar: null, note: null, none: true };
  if (!slotted) return { count: String(total), text: total === 1 ? 'operativo' : 'operativos', bar: null, note: null, none: false };
  return { count: String(available), text: `de ${total} libres en tu horario`, bar: null, note: null, none: available === 0 };
}

export function ResourcePicker(props: PickerProps) {
  const { kind, label, value, selectedId, options, catalog, slotted, scope, taken, invalid, anchor, onPick, onFree } = props;
  const nouns = NOUNS[kind];
  const wide = useMediaQuery('(min-width: 64rem)');
  const listId = useId();
  const cellRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  // `null`: no se ha escrito desde que se abrió; la celda dice su nombre y la lista va completa.
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);

  const enabled = kind === 'reagent' ? (options?.reagentsEnabled ?? false) : (options?.equipmentEnabled ?? false);
  const entries = useMemo((): CatalogEntry[] => {
    if (kind === 'reagent') return (options?.reagents ?? []).map((reagent) => ({ id: reagent.id, name: reagent.name, code: reagent.code, unit: reagent.unit }));
    return (options?.equipmentTypes ?? []).map((type) => ({ id: type.id, name: type.name, code: null, unit: '' }));
  }, [kind, options]);

  const frees = useMemo(() => (catalog ? new Map(entries.map((entry) => [entry.id, freeOf(kind, entry, catalog, slotted)])) : null), [kind, entries, catalog, slotted]);
  const typed = (query ?? '').trim();
  const needle = fold(typed);
  const found = needle === '' ? entries : entries.filter((entry) => fold(`${entry.name} ${entry.code ?? ''}`).includes(needle));
  // Lo agotado va al final, en el mismo orden entre sí; mientras se comprueba, el orden del catálogo.
  const matches = frees ? [...found].sort((a, b) => Number(frees.get(a.id)!.none) - Number(frees.get(b.id)!.none)) : found;
  const choices: Choice[] = [
    ...matches.map((entry): Choice => ({ type: 'entry', entry, taken: taken.has(entry.id) && entry.id !== selectedId })),
    ...(typed !== '' ? [{ type: 'free' as const, name: typed }] : []),
  ];
  const usable = (choice: Choice | undefined) => choice !== undefined && !(choice.type === 'entry' && choice.taken);
  const current = usable(choices[active]) ? active : choices.findIndex(usable);
  const optionId = (index: number) => `${listId}-${index}`;

  useEffect(() => {
    if (open && current >= 0) document.getElementById(optionId(current))?.scrollIntoView({ block: 'nearest' });
  });

  const close = () => {
    setOpen(false);
    setQuery(null);
    setActive(0);
  };
  const choose = (choice: Choice | undefined) => {
    if (!choice || !usable(choice)) return;
    if (choice.type === 'entry') onPick(choice.entry);
    else onFree(choice.name);
    close();
  };
  const filter = (text: string) => {
    setQuery(text);
    setActive(0);
    setOpen(true);
  };
  const move = (step: 1 | -1) => {
    for (let index = current + step; index >= 0 && index < choices.length; index += step) {
      if (usable(choices[index])) return setActive(index);
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) setOpen(true);
      else move(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      choose(choices[current]);
    }
  };
  const descendant = open && current >= 0 ? optionId(current) : undefined;

  const panel = (
    <div className="grid">
      <div className="grid gap-1.5 border-b border-line p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
          <input
            type="search"
            aria-label={`Filtrar ${nouns.many}`}
            aria-controls={listId}
            aria-activedescendant={descendant}
            autoComplete="off"
            spellCheck={false}
            placeholder="Nombre o código"
            value={query ?? ''}
            onChange={(event) => filter(event.target.value)}
            onKeyDown={onKeyDown}
            className="h-9 w-full rounded-control border border-line-strong bg-surface pl-8 pr-2 text-sm text-ink placeholder:text-ink-subtle transition-[border-color,box-shadow] duration-150 focus-visible:border-action focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action/20 max-lg:h-11"
          />
        </div>
        {scope ? <p className="px-0.5 text-[12px] leading-snug text-ink-muted">{scope}</p> : null}
      </div>
      {!options ? <p className="px-3 py-3 text-[13px] text-ink-muted">Cargando el catálogo…</p> : null}
      {options && !enabled ? <p className="px-3 pt-2.5 text-[13px] text-ink-muted">El catálogo de {nouns.many} no está habilitado en este espacio: escribe el nombre y pídelo sin catálogo.</p> : null}
      {options && enabled && entries.length === 0 ? <p className="px-3 pt-2.5 text-[13px] text-ink-muted">Todavía no hay {nouns.many} en el catálogo.</p> : null}
      {options && enabled && matches.length === 0 && typed !== '' ? <p className="px-3 pt-2.5 text-[13px] text-ink-muted">No hay «{typed}» en el catálogo.</p> : null}
      <ul id={listId} role="listbox" aria-label={`${nouns.many[0]!.toUpperCase()}${nouns.many.slice(1)} del catálogo`} className="max-h-80 overflow-y-auto overscroll-contain p-1 empty:hidden max-lg:max-h-none">
        {choices.map((choice, index) => {
          const highlighted = index === current;
          if (choice.type === 'free') {
            return (
              <li
                key="free"
                id={optionId(index)}
                role="option"
                aria-selected={highlighted}
                onMouseDown={(event) => event.preventDefault()}
                onMouseMove={() => setActive(index)}
                onClick={() => choose(choice)}
                className={cn('flex min-h-10 cursor-pointer items-center gap-2 rounded-[8px] px-2.5 py-2 text-[13px] font-medium text-action max-lg:min-h-11', highlighted && 'bg-action-soft')}
              >
                <Plus className="size-4 shrink-0" aria-hidden />
                <span className="min-w-0 break-words">Pedir «{choice.name}» sin catálogo</span>
              </li>
            );
          }
          const { entry } = choice;
          const free = frees?.get(entry.id) ?? null;
          const mine = entry.id === selectedId;
          const status = free ? `${freeLabel(free)}${free.note ? ` · ${free.note}` : ''}` : 'comprobando lo libre';
          return (
            <li
              key={entry.id}
              id={optionId(index)}
              role="option"
              aria-selected={highlighted}
              aria-disabled={choice.taken || undefined}
              aria-label={`${entry.name}${entry.code ? `, ${entry.code}` : ''}: ${status}${choice.taken ? '. Agregado' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseMove={() => setActive(index)}
              onClick={() => choose(choice)}
              className={cn(
                'grid cursor-pointer gap-1 rounded-[8px] px-2.5 py-2 max-lg:min-h-11',
                highlighted && 'bg-surface-sunken',
                choice.taken && 'cursor-default opacity-55',
              )}
            >
              <span className="flex items-start gap-2">
                <span className="min-w-0 flex-1 break-words text-sm font-medium text-ink">{entry.name}</span>
                {mine ? <Check className="mt-0.5 size-4 shrink-0 text-action" aria-hidden /> : null}
                {choice.taken ? <span className="shrink-0 text-[12px] text-ink-muted">Agregado</span> : null}
              </span>
              <span className={cn('text-[12px] tabular-nums', free?.none ? 'text-warning' : 'text-ink-muted')}>
                {entry.code ? <span className="text-ink-subtle">{entry.code} · </span> : null}
                {free ? (
                  <>
                    {free.count ? <strong className={cn('font-semibold', !free.none && 'text-ink')}>{free.count} </strong> : null}
                    {free.text}
                  </>
                ) : (
                  'Comprobando…'
                )}
              </span>
              {free?.bar ? (
                <span aria-hidden className="block">
                  <StockLevelBar percent={free.bar.percent} hasStock={free.bar.hasStock} label={freeLabel(free)} className="h-1.5" />
                </span>
              ) : null}
              {free?.note ? <span className="text-[12px] text-ink-subtle">{free.note}</span> : null}
            </li>
          );
        })}
      </ul>
      <p className="sr-only" aria-live="polite">
        {open && enabled ? plural(matches.length, 'resultado', 'resultados') : ''}
      </p>
    </div>
  );

  if (!wide) {
    return (
      <>
        <button type="button" aria-label={value ? `${label}: ${value}` : label} aria-haspopup="dialog" onClick={() => setOpen(true)} className={cn(bare, 'text-left', !value && 'text-ink-subtle print:text-transparent')}>
          {value || nouns.placeholder}
        </button>
        <Sheet open={open} onOpenChange={(next) => (next ? setOpen(true) : close())} title={nouns.title} description={scope || undefined} icon={nouns.icon} fullscreenMobile focusFirst>
          {panel}
        </Sheet>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <PopoverAnchor virtualRef={anchor as RefObject<HTMLElement>} />
      <span className="grid min-w-0 flex-1">
      <input
        ref={cellRef}
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={descendant}
        aria-invalid={invalid || undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={nouns.placeholder}
        value={query ?? value}
        onChange={(event) => filter(event.target.value)}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={cn(bare, value && query === null && wrapped, 'print:placeholder:text-transparent')}
      />
      {query === null ? <WrapShadow value={value} /> : null}
      </span>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={10}
        className="w-80 p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          // La celda es parte del buscador: escribir o hacer clic en ella no cierra la lista.
          if (cellRef.current?.contains(event.target as Node)) event.preventDefault();
        }}
      >
        {panel}
      </PopoverContent>
    </Popover>
  );
}
