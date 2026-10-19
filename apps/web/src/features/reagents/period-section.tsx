import { cn, sectionLabel } from '@platlab/ui';
import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { DateField } from '../../app/filter-group';
import { Pill } from './filter-pill';
import type { MovementFilters } from './movement-filters';

const periodPresets = [
  { id: 'all', label: 'Todo' },
  { id: '7', label: '7 días' },
  { id: '30', label: '30 días' },
  { id: 'month', label: 'Este mes' },
] as const;

interface DateRange {
  from: string;
  to: string;
}


/** Desde–hasta; el aviso del rango al revés cuelga del campo «Desde». */
function RangeFields({ draft, reversed, onEdit }: { draft: DateRange; reversed: boolean; onEdit: (next: DateRange) => void }) {
  const errorId = useId();
  return (
    <div className="grid gap-1.5 pt-0.5">
      <DateField label="Desde" value={draft.from} onChange={(from) => onEdit({ ...draft, from })} errorId={reversed ? errorId : undefined} />
      <DateField label="Hasta" value={draft.to} onChange={(to) => onEdit({ ...draft, to })} />
      {reversed ? (
        <p id={errorId} role="alert" className="text-[13px] font-medium text-danger">
          La fecha inicial es posterior a la final.
        </p>
      ) : null}
    </div>
  );
}

/** Período: pastillas y, tras «Elegir fechas», desde–hasta. */
export function PeriodSection({ period, onChange }: { period: MovementFilters['period']; onChange: (period: MovementFilters['period']) => void }) {
  const name = useId();
  const [custom, setCustom] = useState(period.kind === 'range');
  const [draft, setDraft] = useState<DateRange>({ from: period.kind === 'range' ? (period.from ?? '') : '', to: period.kind === 'range' ? (period.to ?? '') : '' });
  const previous = useRef(period.kind);
  // Si otra cosa cambia el periodo (la ficha, un enlace), los campos de fechas lo siguen.
  useEffect(() => {
    if (period.kind === 'range') {
      setCustom(true);
      setDraft({ from: period.from ?? '', to: period.to ?? '' });
    } else if (previous.current === 'range') {
      setCustom(false);
      setDraft({ from: '', to: '' });
    }
    previous.current = period.kind;
  }, [period]);

  const reversed = draft.from !== '' && draft.to !== '' && draft.from > draft.to;
  const editRange = (next: DateRange) => {
    setDraft(next);
    // Con el rango al revés no se aplica nada: el aviso queda en el campo hasta corregirlo.
    if (next.from !== '' && next.to !== '' && next.from > next.to) return;
    onChange(next.from === '' && next.to === '' ? { kind: 'all' } : { kind: 'range', from: next.from || null, to: next.to || null });
  };

  const current = period.kind === 'range' ? 'range' : period.kind === 'days' ? String(period.days) : period.kind;
  const preset = (id: (typeof periodPresets)[number]['id']): MovementFilters['period'] =>
    id === 'all' ? { kind: 'all' } : id === 'month' ? { kind: 'month' } : { kind: 'days', days: Number(id) };
  // Un enlace puede traer otro número de días (hasta 90) o «mes anterior»: se muestra marcado y se puede cambiar.
  const odd = period.kind === 'days' && period.days !== 7 && period.days !== 30 ? `${period.days} días` : period.kind === 'previous-month' ? 'Mes anterior' : null;
  const firstFocus = current === 'range' ? null : (periodPresets.find((option) => option.id === current)?.id ?? periodPresets[0].id);
  return (
    <fieldset className="min-w-0 px-2 pb-2.5 pt-1">
      <legend className={cn(sectionLabel, 'flex min-h-8 items-center px-0')}>Periodo</legend>
      <div className="flex flex-wrap gap-1">
        {periodPresets.map((option) => (
          <Pill
            key={option.id}
            type="radio"
            name={name}
            checked={current === option.id}
            toggleGroup={firstFocus === option.id ? 'period' : undefined}
            onChange={() => {
              setCustom(false);
              onChange(preset(option.id));
            }}
          >
            {option.label}
          </Pill>
        ))}
        {odd !== null ? (
          <Pill type="radio" name={name} checked onChange={() => undefined}>
            {odd}
          </Pill>
        ) : null}
      </div>
      <button
        type="button"
        data-group-toggle={current === 'range' ? 'period' : undefined}
        aria-expanded={custom}
        onClick={() => setCustom(!custom)}
        className="mt-1 inline-flex min-h-[44px] items-center gap-1 rounded-control text-[13px] font-medium text-action transition-colors hover:text-action-hover sm:min-h-8"
      >
        Elegir fechas
        <ChevronDown aria-hidden className={cn('size-3.5 transition-transform duration-150', custom && 'rotate-180')} />
      </button>
      {custom ? <RangeFields draft={draft} reversed={reversed} onEdit={editRange} /> : null}
    </fieldset>
  );
}
