import { compareDecimals } from '@platlab/contracts';
import { Badge, Quantity, Tooltip, cn } from '@platlab/ui';
import { Check, CircleHelp, TriangleAlert, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { verdictOf, type CheckAnswer, type CheckPlan, type Verdict } from './request-check';
import { totalOf, type DraftEquipment, type DraftLine, type DraftMaterial, type DraftReagent } from './request-draft';

/**
 * «Tu pedido» en el panel «Recursos» (ADR 0023, «Disponibilidad y recursos»): cada línea con su cantidad (por grupo si
 * la hoja lo admite) y lo que dice la regla única de lo que hay escrito ahora: alcanza, no alcanza y cuánto hay, sin
 * verificar o, si se está escribiendo, «Comprobando…». Nunca muestra un resultado de antes (sin UI optimista sobre el stock).
 */

export interface OrderProps {
  lines: readonly DraftLine[];
  /** Las columnas de Recursos del formato, en su orden: agrupan el pedido. */
  kinds: ReadonlyArray<{ kind: DraftLine['kind']; label: string }>;
  groups: number;
  byGroupAllowed: boolean;
  plan: CheckPlan | null;
  answer: CheckAnswer | undefined;
  /** Lo que el servidor rechazó al guardar, por posición de la línea. */
  issues: Readonly<Record<number, string>>;
  /** La línea recién agregada recibe el foco en su cantidad. */
  focusId: string | null;
  onLine: (line: DraftLine) => void;
  onRemove: (id: string) => void;
  /** Vacío: qué hacer para empezar (en el móvil, el botón que abre el catálogo). */
  empty: ReactNode;
}

const decimal = (text: string) => text.replace(/[^\d.,]/g, '');
const integer = (text: string) => text.replace(/\D/g, '');
const field =
  'h-10 rounded-control border border-line-strong bg-surface px-3 text-sm text-ink tabular-nums placeholder:text-ink-subtle transition-[border-color,box-shadow] duration-150 hover:border-ink-subtle focus-visible:border-action focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-action/20 aria-[invalid=true]:border-danger max-sm:h-11';

function Status({ tone, icon, label, children }: { tone: 'success' | 'warning' | 'neutral'; icon: ReactNode; label: string; children?: ReactNode }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-muted">
      <Badge tone={tone}>
        {icon}
        {label}
      </Badge>
      {children ? <span>{children}</span> : null}
    </p>
  );
}

const quiet = (text: string) => <p className="text-[13px] text-ink-subtle">{text}</p>;

/** Lo que se dice de una línea, siempre con texto además del color. */
function VerdictText({ verdict, line }: { verdict: Verdict; line: DraftLine }) {
  if (verdict.state === 'material') return <Status tone="neutral" icon={null} label="No se inventaría" />;
  if (verdict.state === 'checking') return quiet('Comprobando…');
  if (verdict.state === 'incomplete') {
    if (line.name.trim() === '') return quiet('Escribe qué necesitas.');
    return quiet(line.kind === 'reagent' && !line.catalog ? 'Escribe la cantidad y la unidad para comprobar.' : 'Escribe la cantidad para comprobar.');
  }
  const checked = verdict.line;
  if (checked.check === 'unverified') {
    const catalog = (checked.kind === 'reagent' && checked.itemId !== null) || (checked.kind === 'equipment' && checked.assetTypeId !== null);
    return (
      <Status tone="neutral" icon={<CircleHelp className="size-3.5" aria-hidden />} label="Sin verificar">
        {catalog ? 'No hay inventario que lo verifique ahora.' : 'No está en el catálogo: el laboratorio lo revisa.'}
      </Status>
    );
  }
  const ok = checked.check === 'ok';
  const badge = ok ? { tone: 'success' as const, icon: <Check className="size-3.5" aria-hidden />, label: 'Alcanza' } : { tone: 'warning' as const, icon: <TriangleAlert className="size-3.5" aria-hidden />, label: 'No alcanza' };
  if (checked.kind === 'reagent' && checked.available !== null) {
    const forDates = verdict.dates > 1 ? ` para tus ${verdict.dates} fechas` : '';
    const free = compareDecimals(checked.available, '0') <= 0 ? <>Sin stock libre</> : <>Hay <Quantity value={checked.available} unit={checked.unit} /> libres</>;
    return (
      <Status {...badge}>
        {free}
        {ok ? '.' : <>; pides <Quantity value={verdict.needed} unit={checked.unit} />{forDates}.</>}
      </Status>
    );
  }
  if (checked.kind === 'equipment' && checked.available !== null) {
    const free = checked.available;
    const count = verdict.slot
      ? free === 0
        ? 'Ninguno libre en tu horario'
        : `Hay ${free} ${free === 1 ? 'libre' : 'libres'} en tu horario`
      : free === 0
        ? 'Ninguno operativo'
        : `Hay ${free} ${free === 1 ? 'operativo' : 'operativos'}`;
    return <Status {...badge}>{ok ? `${count}.` : `${count}; pides ${checked.quantity}.`}</Status>;
  }
  return <Status {...badge} />;
}

function ReagentAmount({ line, autoFocus, invalid, onLine }: { line: DraftReagent; autoFocus: boolean; invalid: boolean; onLine: (line: DraftLine) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        aria-label={`Cantidad de ${line.name}`}
        aria-invalid={invalid || undefined}
        inputMode="decimal"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder="0"
        value={line.quantity}
        onChange={(event) => onLine({ ...line, quantity: decimal(event.target.value) })}
        className={cn(field, 'w-28 text-right')}
      />
      {line.catalog ? (
        <span className="text-sm text-ink-muted">{line.unit}</span>
      ) : (
        <input aria-label={`Unidad de ${line.name}`} autoComplete="off" maxLength={10} placeholder="Unidad" value={line.unit} onChange={(event) => onLine({ ...line, unit: event.target.value })} className={cn(field, 'w-24')} />
      )}
    </div>
  );
}

/** Equipos y materiales: el total o, con «Por grupo», lo de cada grupo y el total que resulta. */
function CountAmount({ line, groups, byGroupAllowed, autoFocus, invalid, onLine }: { line: DraftEquipment | DraftMaterial; groups: number; byGroupAllowed: boolean; autoFocus: boolean; invalid: boolean; onLine: (line: DraftLine) => void }) {
  const clean = line.kind === 'equipment' ? integer : decimal;
  const total = totalOf(line.perGroup, groups);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <input
        aria-label={line.byGroup ? `Cantidad por grupo de ${line.name}` : `Cantidad de ${line.name}`}
        aria-invalid={invalid || undefined}
        inputMode={line.kind === 'equipment' ? 'numeric' : 'decimal'}
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder="0"
        value={line.byGroup ? line.perGroup : line.quantity}
        onChange={(event) => onLine(line.byGroup ? { ...line, perGroup: clean(event.target.value) } : { ...line, quantity: clean(event.target.value) })}
        className={cn(field, 'w-24 text-right')}
      />
      {byGroupAllowed ? (
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink sm:min-h-9">
          <input
            type="checkbox"
            checked={line.byGroup}
            onChange={(event) =>
              onLine(event.target.checked ? { ...line, byGroup: true, perGroup: line.quantity } : { ...line, byGroup: false, perGroup: '', quantity: total || line.quantity })
            }
            className="size-5 shrink-0 cursor-pointer accent-action-deep sm:size-4"
          />
          Por grupo
        </label>
      ) : null}
      {line.byGroup && total !== '' ? <span className="text-[13px] tabular-nums text-ink-muted">× {groups} {groups === 1 ? 'grupo' : 'grupos'} = {total} en total</span> : null}
    </div>
  );
}

export function OrderPane({ lines, kinds, groups, byGroupAllowed, plan, answer, issues, focusId, onLine, onRemove, empty }: OrderProps) {
  const indexed = lines.map((line, index) => ({ line, index }));
  if (indexed.length === 0) return <div className="grid place-items-start gap-3 py-2 text-sm text-ink-muted">{empty}</div>;
  return (
    <div className="grid gap-5">
      {kinds.map(({ kind, label }) => {
        const ofKind = indexed.filter(({ line }) => line.kind === kind);
        if (ofKind.length === 0) return null;
        return (
          <section key={kind} aria-label={label}>
            <h3 className="mb-1 text-[13px] font-medium text-ink-muted">
              {label} · {ofKind.length}
            </h3>
            <ul className="divide-y divide-line">
              {ofKind.map(({ line, index }) => {
                const issue = issues[index];
                const catalog = line.kind !== 'material' && line.catalog;
                return (
                  <li key={line.id} className="grid gap-2 py-3">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        {catalog ? (
                          <p className="break-words text-sm font-medium text-ink">{line.name}</p>
                        ) : (
                          <input
                            aria-label={`Nombre de ${line.name || label}`}
                            autoComplete="off"
                            maxLength={200}
                            value={line.name}
                            onChange={(event) => onLine({ ...line, name: event.target.value })}
                            className={cn(field, 'h-9 w-full font-medium')}
                          />
                        )}
                        {line.kind !== 'material' && !line.catalog ? <p className="mt-1 text-[12px] text-ink-subtle">Sin catálogo</p> : null}
                      </div>
                      <Tooltip label={`Quitar ${line.name || label}`}>
                        <button
                          type="button"
                          aria-label={`Quitar ${line.name || label}`}
                          onClick={() => onRemove(line.id)}
                          className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-action max-sm:size-11"
                        >
                          <X className="size-4" aria-hidden />
                        </button>
                      </Tooltip>
                    </div>
                    {line.kind === 'reagent' ? (
                      <ReagentAmount line={line} autoFocus={line.id === focusId} invalid={issue !== undefined} onLine={onLine} />
                    ) : (
                      <CountAmount line={line} groups={groups} byGroupAllowed={byGroupAllowed} autoFocus={line.id === focusId} invalid={issue !== undefined} onLine={onLine} />
                    )}
                    <VerdictText verdict={verdictOf(line, index, plan, answer)} line={line} />
                    {issue ? <p className="text-[13px] text-danger">{issue}</p> : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
