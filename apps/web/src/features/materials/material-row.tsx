import type { MaterialStockLine, StockedMaterial } from '@platlab/contracts';
import { Badge, Button, Quantity, Skeleton, ratioPercent } from '@platlab/ui';
import { ChevronDown, MapPin } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { CodeTag } from '../../app/code-tag';
import { todayInZone } from '../../app/format';
import { QueryErrorState } from '../../app/states';
import { useMaterials } from './context';
import { ExpiryBadge } from './expiry-badge';
import { MaterialThumb } from './material-thumb';
import { useStock } from './queries';
import { SegmentBar } from './segment-bar';
import { byExpiry, classLabels, expiryStatus, lentOut, materialLevel, materialStatus } from './text';

const dotTone = { danger: 'bg-danger', warning: 'bg-warning', success: 'bg-success' } as const;
const figureTone = { danger: 'text-danger', warning: 'text-warning', success: 'text-ink' } as const;

/**
 * Columnas de la lista en escritorio: imagen, material, ubicación, barra, Disponible, En préstamo, Mínimo y el chevron. La
 * cabecera de `MaterialsResults` usa la misma plantilla para quedar alineada.
 */
export const rowColumns = 'lg:grid-cols-[3rem_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,7rem)_6.5rem_6.5rem_6.5rem_2.25rem]';

/** Una cifra de columna en escritorio: alineada a la derecha, con su nombre para quien usa lector de pantalla. */
function Figure({ label, children, className = 'text-ink' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <p className={`hidden text-right text-sm font-semibold tabular-nums lg:block ${className}`}>
      <span className="sr-only">{label}: </span>
      {children}
    </p>
  );
}

/** Dónde está el material: la ubicación principal y, si hay más, cuántas otras. */
function Where({ names }: { names: readonly string[] }) {
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-[13px] text-ink-muted">
      <MapPin className="size-3.5 shrink-0 text-ink-subtle" aria-hidden />
      {names.length === 0 ? (
        <span>Sin ubicación: aún no se ingresa</span>
      ) : (
        <>
          <span className="truncate" title={names.join(', ')}>
            {names[0]}
          </span>
          {names.length > 1 ? <span className="shrink-0 font-medium text-ink">+{names.length - 1}</span> : null}
        </>
      )}
    </p>
  );
}

/**
 * Lo que el material tiene en cada ubicación, con su barra, al expandir la fila. Si el insumo vence, cada lote va en su
 * propia línea con su semáforo, primero lo que vence antes (MA-01f).
 */
function Positions({ productId, unit, today }: { productId: string; unit: string; today: string }) {
  const { workspaceId } = useMaterials();
  const stock = useStock(workspaceId, productId);
  if (stock.isPending) return <Skeleton className="mx-5 mb-3 h-16 rounded-panel" />;
  if (stock.isError) return <QueryErrorState error={stock.error} onRetry={() => void stock.refetch()} />;
  const lines = byExpiry(stock.data.items.filter((line: MaterialStockLine) => line.balance !== '0'));
  if (lines.length === 0) return <p className="px-5 pb-3 text-sm text-ink-muted">Sin existencias en ninguna ubicación.</p>;
  return (
    <ul className="mx-4 mb-3 grid gap-px overflow-hidden rounded-panel bg-line sm:mx-5 lg:ml-[5.25rem]">
      {lines.map((line: MaterialStockLine) => {
        const percent = ratioPercent(line.available, line.balance) ?? 0;
        const expiry = expiryStatus(line.expiresOn, today);
        return (
          <li key={line.positionId} className="grid items-center gap-x-4 gap-y-1.5 bg-surface-sunken px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto]">
            <div className="grid min-w-0 gap-1">
              <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-ink">
                <MapPin className="size-3.5 shrink-0 text-ink-subtle" aria-hidden />
                <span className="truncate">{line.locationPath.join(' › ')}</span>
              </p>
              {expiry || line.lot ? (
                <p className="flex flex-wrap items-center gap-1.5 text-[12px] text-ink-muted">
                  {line.lot ? <span>Lote {line.lot}</span> : null}
                  {expiry ? <ExpiryBadge status={expiry} /> : null}
                </p>
              ) : null}
            </div>
            <SegmentBar percent={percent} hasStock label={`En el estante: ${percent} %`} />
            <p className="text-[13px] tabular-nums text-ink-muted">
              <Quantity value={line.available} unit={unit} /> de <Quantity value={line.balance} unit={unit} />
            </p>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Un material en la lista del Inventario (ADR 0025): su imagen, nombre y clase, dónde está, su barra de existencia en diez
 * tramos y su estado en texto. Tocar la fila abre su ficha; el chevron despliega sus ubicaciones, cada una con su barra.
 */
export function MaterialRow({ material, onOpen }: { material: StockedMaterial; onOpen: () => void }) {
  const { me } = useMaterials();
  const today = todayInZone(me.workspace.timeZone);
  const [expanded, setExpanded] = useState(false);
  // Solo el lote que vence antes y pide atención (≤ 180 días o vencido) se ve en la fila; lo lejano, en la ficha.
  const expiry = expiryStatus(material.nextExpiry, today);
  const expiryAlert = expiry && expiry.tone !== 'neutral' ? expiry : null;
  const level = materialLevel(material);
  const empty = material.balance === '0';
  const status = materialStatus(material);
  const lent = lentOut(material.balance, material.available);
  const reusable = material.class !== 'consumable';
  return (
    <li>
      <div
        className={`group relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 px-4 py-3.5 transition-colors hover:bg-surface-sunken/40 has-[button.open:focus-visible]:outline-2 has-[button.open:focus-visible]:-outline-offset-2 has-[button.open:focus-visible]:outline-action sm:px-5 ${rowColumns}`}
      >
        <MaterialThumb name={material.name} materialClass={material.class} className="size-12 [&>svg]:size-5" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">
            <button type="button" aria-haspopup="dialog" onClick={onOpen} className="open max-w-full truncate text-left after:absolute after:inset-0 focus-visible:outline-none">
              {material.name}
            </button>
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-muted">
            <span className="inline-flex items-center gap-1.5 font-medium text-ink">
              <span aria-hidden className={`size-2 rounded-full ${dotTone[status.tone]}`} />
              {status.label}
            </span>
            {expiryAlert ? <ExpiryBadge status={expiryAlert} /> : null}
            <CodeTag>{material.code}</CodeTag>
            {classLabels[material.class]}
          </p>
        </div>
        <Button
          variant="ghost"
          className="relative z-10 size-11 shrink-0 p-0 sm:size-9 lg:order-last"
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Ocultar' : 'Ver'} ubicaciones de ${material.name}`}
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronDown className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} aria-hidden />
        </Button>
        <div className="col-span-3 lg:col-span-1">
          <Where names={material.locationNames} />
        </div>
        <div className="col-span-3 grid gap-1.5 lg:col-span-1">
          {level.percent === null ? null : <SegmentBar percent={level.percent} hasStock={!empty} label={`${level.measure}: ${level.percent} %`} />}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-muted lg:hidden">
            {reusable ? (
              <span>
                <b className="font-semibold tabular-nums text-ink">
                  <Quantity value={material.available} unit={material.baseUnit} />
                </b>{' '}
                de <Quantity value={material.balance} unit={material.baseUnit} /> disponibles
              </span>
            ) : (
              <span>
                <b className="font-semibold tabular-nums text-ink">
                  <Quantity value={material.balance} unit={material.baseUnit} />
                </b>{' '}
                · {level.note.toLowerCase()}
              </span>
            )}
            {lent !== '0' ? <Badge tone="info" className="px-2 py-0.5 text-[11px]">Prestado {lent} {material.baseUnit}</Badge> : null}
          </p>
        </div>
        <Figure label="Disponible" className={figureTone[status.tone]}>
          <Quantity value={material.available} unit={material.baseUnit} />
        </Figure>
        <Figure label="En préstamo" className={lent === '0' ? 'text-ink-subtle' : 'text-info'}>
          {lent === '0' ? '—' : <Quantity value={lent} unit={material.baseUnit} />}
        </Figure>
        <Figure label="Mínimo" className="font-normal text-ink-muted">
          {material.minimum ? <Quantity value={material.minimum} unit={material.baseUnit} /> : '—'}
        </Figure>
      </div>
      {expanded ? <Positions productId={material.id} unit={material.baseUnit} today={today} /> : null}
    </li>
  );
}
