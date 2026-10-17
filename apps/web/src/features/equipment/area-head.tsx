import type { Area, AssetCondition } from '@platlab/contracts';
import { Button, IconTile, cn } from '@platlab/ui';
import { Check, Microscope, QrCode } from 'lucide-react';
import { glassCard, primaryAction } from '../../app/glass';
import { ModuleMark } from '../../app/module-mark';
import { RefreshButton } from '../../app/refresh-button';
import { AreaManagerLine } from './area-manager';
import { conditionLabel, stateParts } from './asset-text';
import { RegisterAssetButton } from './sheets/register-asset';

const number = new Intl.NumberFormat('es-EC');

/** El botón «Etiquetas QR» del membrete: el área devuelve el foco ahí al cerrar el modo con Escape. */
export const labelsButtonId = 'etiquetas-qr';

const dot = { operational: 'bg-success', restricted: 'bg-warning', faulted: 'bg-danger' } as const;

/** La pastilla marcada se pinta de su tono: fondo, borde y texto; el ✓ sustituye al punto. */
const pressed = {
  operational: 'aria-pressed:border-success aria-pressed:bg-success-soft aria-pressed:text-success',
  restricted: 'aria-pressed:border-warning aria-pressed:bg-warning-soft aria-pressed:text-warning',
  faulted: 'aria-pressed:border-danger aria-pressed:bg-danger-soft aria-pressed:text-danger',
} as const;

/**
 * Membrete del área (E-01c), en vidrio con el degradado suave del módulo y el microscopio de marca de agua:
 * el icono, el nombre con ⟳ «Actualizar» y, a la derecha, «Registrar equipo» con el área ya puesta (solo si se
 * administra el catálogo) y «Etiquetas QR», un interruptor (`aria-pressed`) del modo etiquetas que gira los
 * cuadros del área a su etiqueta; lo ve todo el que ve el área si tiene equipos activos; debajo, el
 * encargado con su lápiz (solo del Administrador) y cuántos equipos y tipos tiene. La barra de salud reparte
 * el área en operativos, uso limitado y fuera de servicio; las tres pastillas de debajo dicen lo mismo con
 * texto y filtran el área: tocar una la pinta de su tono con un ✓, tocarla otra vez quita el filtro. Los dados
 * de baja, si hay, tienen su enlace aparte.
 */
export function AreaHeader({
  area,
  typeCount,
  canManage,
  freshness,
  filter,
  onFilter,
  labels,
}: {
  area: Area;
  /** Cuántos tipos hay en el área, si ya se cargaron; si no, se omite. */
  typeCount: number | undefined;
  canManage: boolean;
  freshness: { updatedAt: number; refreshing: boolean; refresh: () => void };
  /** La pastilla tocada, o el enlace de los dados de baja; nula, sin filtro. */
  filter: AssetCondition | null;
  onFilter: (filter: AssetCondition | null) => void;
  /** El modo etiquetas: si está activo y cómo se alterna. */
  labels: { active: boolean; onToggle: () => void };
}) {
  const toggle = (next: AssetCondition) => onFilter(filter === next ? null : next);
  const counts = { operational: area.total - area.faulted - area.restricted, restricted: area.restricted, faulted: area.faulted };
  const figures = [
    { value: 'operational', label: 'Operativos' },
    { value: 'restricted', label: conditionLabel.restricted },
    { value: 'faulted', label: conditionLabel.faulted },
  ] as const;
  const parts = stateParts(counts);
  return (
    <section
      aria-label="Datos del área"
      className={cn(glassCard, 'relative isolate grid gap-4 overflow-hidden bg-linear-to-br from-action-soft/80 via-white/60 to-white/70 p-5 md:p-6')}
    >
      {/* Marca de agua: decorativa, a la derecha y detrás de todo. */}
      <ModuleMark
        code="equipment"
        className="pointer-events-none absolute -bottom-10 -right-6 -z-10 size-52 rotate-12 text-action/[0.07]"
      />
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <IconTile icon={Microscope} size="lg" />
          <h1 className="min-w-0 text-balance break-words text-[1.75rem] font-bold leading-tight tracking-tight text-ink">{area.name}</h1>
          <RefreshButton freshness={freshness} />
        </div>
        {canManage || area.total > 0 ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row-reverse sm:items-center">
            {canManage ? <RegisterAssetButton initialLocationId={area.id} className={cn(primaryAction, 'h-12 w-full px-5 sm:w-auto')} /> : null}
            {area.total > 0 ? (
              <Button
                id={labelsButtonId}
                aria-pressed={labels.active}
                className="h-12 w-full rounded-2xl bg-white/80 px-5 text-base font-semibold text-action hover:bg-white aria-pressed:border-action/40 aria-pressed:bg-action-soft sm:w-auto [&_svg]:size-5"
                onClick={labels.onToggle}
              >
                <QrCode aria-hidden />
                Etiquetas QR
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <div className="flex min-w-0 max-w-full items-center gap-2">
          {area.manager ? <span className="shrink-0 text-[13px] text-ink-muted">Encargado:</span> : null}
          <AreaManagerLine area={area} canManage={canManage} />
        </div>
        <p className="text-[13px] font-medium tabular-nums text-ink-muted">
          {number.format(area.total)} {area.total === 1 ? 'equipo' : 'equipos'}
          {typeCount === undefined ? null : ` · ${number.format(typeCount)} ${typeCount === 1 ? 'tipo' : 'tipos'}`}
        </p>
      </div>
      <div className="grid gap-3">
        {parts.length > 0 ? (
          <div
            role="img"
            aria-label={parts.map((part) => part.text).join(', ')}
            className="flex h-3.5 gap-1 overflow-hidden rounded-full bg-white/70 p-[3px] shadow-[inset_0_1px_2px_rgb(15_23_42/0.08)]"
          >
            {figures.map((figure) =>
              counts[figure.value] > 0 ? (
                <span
                  key={figure.value}
                  style={{ flexGrow: counts[figure.value] }}
                  className={cn('basis-0 rounded-full', dot[figure.value])}
                />
              ) : null,
            )}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          {figures.map((figure) => (
            <button
              key={figure.value}
              type="button"
              aria-pressed={filter === figure.value}
              disabled={counts[figure.value] === 0 && filter !== figure.value}
              onClick={() => toggle(figure.value)}
              className={cn(
                'group inline-flex h-11 items-center gap-2 rounded-full border border-line-strong bg-white/70 px-4 text-[13px] font-medium text-ink transition-[background-color,border-color,color] duration-150 ease-out-expo hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action disabled:opacity-50 disabled:hover:bg-white/70 sm:h-9',
                pressed[figure.value],
              )}
            >
              <span aria-hidden className={cn('size-2.5 shrink-0 rounded-full group-aria-pressed:hidden', dot[figure.value])} />
              <Check className="hidden size-4 shrink-0 group-aria-pressed:block" strokeWidth={3} aria-hidden />
              <span className="font-semibold tabular-nums">{number.format(counts[figure.value])}</span>
              {figure.label}
            </button>
          ))}
          {area.retired > 0 ? (
            <button
              type="button"
              aria-pressed={filter === 'retired'}
              onClick={() => toggle('retired')}
              className="inline-flex h-11 items-center rounded-control px-2 text-[13px] font-medium text-ink-muted underline-offset-4 hover:text-action hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action aria-pressed:text-action aria-pressed:underline sm:ml-auto sm:h-9"
            >
              Dados de baja ({number.format(area.retired)})
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
