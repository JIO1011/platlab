import type { AssetTotals } from '@platlab/contracts';
import { Button, Skeleton, cn } from '@platlab/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { formatMoney } from './asset-facts';
import { NO_RESPONSIBLE } from './asset-text';
import { isFiltered, type AssetQuery } from './asset-filters';

const number = new Intl.NumberFormat('es-EC');

/** Cada indicador marcado se pinta de su tono (fondo, borde y texto) y lleva un ✓: nada se dice solo con color. */
const tones = {
  action: 'aria-pressed:border-action aria-pressed:bg-action-soft aria-pressed:text-action',
  warning: 'aria-pressed:border-warning aria-pressed:bg-warning-soft aria-pressed:text-warning',
} as const;

const tile = 'flex min-w-0 flex-col items-start justify-start gap-0.5 rounded-control border border-line bg-surface px-3 py-2 text-left';

/**
 * Indicadores del Informe (E-01c), bajo la cabecera y con los mismos filtros que la tabla: equipos, valor de
 * reposición (solo informa), sin responsable, garantía por vencer y vida útil cumplida. Tocar uno aplica su
 * filtro y lo marca con su tono, tocarlo otra vez lo quita; «Equipos» quita todos. Un indicador en cero no se
 * ofrece (salvo que su filtro esté puesto); «Equipos» queda marcado sin búsqueda ni filtros. En 5 columnas cuando caben y, si no, en una fila desplazable.
 */
export function AssetIndicators({
  totals,
  query,
  onApply,
  onClear,
}: {
  totals: UseQueryResult<AssetTotals>;
  query: AssetQuery;
  onApply: (change: Partial<AssetQuery>) => void;
  onClear: () => void;
}) {
  if (totals.isError && !totals.data) {
    return (
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control bg-surface px-3 py-1 shadow-raised">
        <p role="alert" className="text-[13px] text-ink-muted">
          No se pudieron cargar los indicadores.
        </p>
        <Button variant="ghost" size="sm" className="h-[44px] sm:h-8" onClick={() => void totals.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const data = totals.data;
  const only = <T,>(values: readonly T[], value: T) => values.length === 1 && values[0] === value;
  const noResponsible = only(query.responsibles, NO_RESPONSIBLE);
  const expiring = only(query.warranties, 'expiring');
  const reached = only(query.usefulLives, 'reached');

  return (
    <div className="@container mb-4">
      <ul
        aria-label="Indicadores del Informe"
        aria-busy={totals.isPlaceholderData}
        className={cn(
          'flex gap-2 overflow-x-auto pb-1 transition-opacity duration-150 @xl:grid @xl:grid-cols-[1fr_1.5fr_1fr_1fr_1fr] @xl:overflow-visible @xl:pb-0',
          totals.isPlaceholderData && 'opacity-60',
        )}
      >
        {data ? (
          <>
            <Indicator label="Equipos" value={number.format(data.count)} tone="action" pressed={!isFiltered(query)} onClick={onClear} />
            <li className="w-44 shrink-0 @xl:w-auto">
              <div className={cn(tile, 'h-full')}>
                <span className="text-lg font-bold leading-tight tabular-nums text-ink">{formatMoney(data.replacementValue)}</span>
                <span className="text-[13px] leading-tight text-ink-muted">Valor de reposición</span>
              </div>
            </li>
            <Indicator
              label="Sin responsable"
              value={number.format(data.withoutResponsible)}
              tone="warning"
              pressed={noResponsible}
              empty={data.withoutResponsible === 0}
              onClick={() => onApply({ responsibles: noResponsible ? [] : [NO_RESPONSIBLE] })}
            />
            <Indicator
              label="Garantía por vencer"
              value={number.format(data.warrantyExpiring)}
              tone="warning"
              pressed={expiring}
              empty={data.warrantyExpiring === 0}
              onClick={() => onApply({ warranties: expiring ? [] : ['expiring'] })}
            />
            <Indicator
              label="Vida útil cumplida"
              value={number.format(data.usefulLifeReached)}
              tone="warning"
              pressed={reached}
              empty={data.usefulLifeReached === 0}
              onClick={() => onApply({ usefulLives: reached ? [] : ['reached'] })}
            />
          </>
        ) : (
          [0, 1, 2, 3, 4].map((slot) => (
            <li key={slot} className="w-36 shrink-0 @xl:w-auto" aria-hidden>
              <Skeleton className="h-[3.75rem] w-full rounded-control" />
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function Indicator({
  label,
  value,
  tone,
  pressed,
  empty = false,
  onClick,
}: {
  label: string;
  value: string;
  tone: keyof typeof tones;
  pressed: boolean;
  /** En cero: no hay nada que filtrar, salvo que su filtro ya esté puesto (entonces se puede quitar). */
  empty?: boolean;
  onClick: () => void;
}) {
  return (
    <li className="w-36 shrink-0 @xl:w-auto">
      <button
        type="button"
        aria-pressed={pressed}
        disabled={empty && !pressed}
        onClick={onClick}
        className={cn(
          tile,
          'group relative h-full w-full text-ink transition-[background-color,border-color,color] duration-150 ease-out-expo hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action disabled:opacity-50 disabled:hover:bg-surface',
          tones[tone],
        )}
      >
        <Check className="absolute right-2 top-2 hidden size-3.5 group-aria-pressed:block" strokeWidth={3} aria-hidden />
        <span className="text-lg font-bold leading-tight tabular-nums">{value}</span>
        <span className="text-[13px] leading-tight text-ink-muted group-aria-pressed:text-inherit">{label}</span>
      </button>
    </li>
  );
}
