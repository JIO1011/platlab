import type { StockedMaterial } from '@platlab/contracts';
import { Badge, IconChip, Quantity, StockLevelBar, cn } from '@platlab/ui';
import { CircleAlert, Layers, PackageOpen, Repeat2, ScanBarcode, TrendingDown } from 'lucide-react';
import { CodeTag } from '../../app/code-tag';
import { ModuleMark } from '../../app/module-mark';
import { classLabels, materialLevel } from './text';

const classIcons = { consumable: PackageOpen, reusable_counted: Repeat2, reusable_identified: ScanBarcode } as const;

/**
 * Un material en su tarjeta (ADR 0025), con la forma de la de Reactivos: la clase con su icono, el nombre y su código;
 * debajo, lo disponible hoy en grande con su barra de nivel y una nota (el mínimo del insumo o lo prestado del
 * reutilizable). Toda la tarjeta abre su ficha, donde se ingresa, se da salida y se ajusta.
 */
export function MaterialCard({ material, onOpen }: { material: StockedMaterial; onOpen: () => void }) {
  const level = materialLevel(material);
  const empty = material.balance === '0';
  return (
    <li className="group relative flex flex-col gap-3 overflow-hidden rounded-[20px] bg-surface p-4 shadow-raised transition-[transform,box-shadow] duration-200 ease-out-expo hover:shadow-float has-[button:focus-visible]:outline-2 has-[button:focus-visible]:outline-offset-2 has-[button:focus-visible]:outline-action motion-safe:hover:-translate-y-1">
      {/* Marca de agua: decorativa y casi invisible. */}
      <ModuleMark
        code="materials"
        className="pointer-events-none absolute -bottom-4 -right-3 size-24 rotate-12 text-surface-sunken transition-[color,transform] duration-500 group-hover:text-action-soft motion-safe:group-hover:scale-110"
      />
      <div className="relative flex min-w-0 items-center gap-2.5">
        <IconChip icon={classIcons[material.class]} tone={empty ? 'neutral' : 'accent'} size="sm" />
        <div className="grid min-w-0 gap-0.5">
          <p className="text-[11px] font-semibold uppercase leading-none tracking-wide text-ink-muted">{classLabels[material.class]}</p>
          <CodeTag className="w-fit max-w-full truncate bg-transparent p-0 text-[11px]">{material.code}</CodeTag>
        </div>
      </div>
      <h2 className="relative text-balance break-words text-[15px] font-bold leading-snug text-ink transition-colors group-hover:text-action">
        <button type="button" aria-haspopup="dialog" onClick={onOpen} className="text-left after:absolute after:inset-0 focus-visible:outline-none">
          {material.name}
        </button>
      </h2>
      <div className="relative mt-auto grid gap-2 border-t border-line pt-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="grid min-w-0 gap-1">
            <p className="text-[11px] font-semibold uppercase leading-5 tracking-wide text-ink-muted">Disponible</p>
            <Quantity
              value={material.available}
              unit={material.baseUnit}
              className={cn('block min-w-0 whitespace-normal text-[22px] font-bold leading-tight tracking-tight [overflow-wrap:anywhere]', empty ? 'text-ink-subtle' : 'text-action')}
              unitClassName="text-[0.7em]"
            />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {empty ? (
              <Badge tone="warning" className="whitespace-nowrap px-2 py-0.5 text-[11px]">
                <CircleAlert className="size-3" aria-hidden />
                Sin existencias
              </Badge>
            ) : (
              <Badge className="whitespace-nowrap px-2 py-0.5 text-[11px] font-semibold text-ink">
                <Layers className="size-3" aria-hidden />
                {material.locationsWithStock === 1 ? '1 ubicación' : `${material.locationsWithStock} ubicaciones`}
              </Badge>
            )}
            {material.belowMinimum ? (
              <Badge tone="warning" className="whitespace-nowrap px-2 py-0.5 text-[11px]">
                <TrendingDown className="size-3" aria-hidden />
                Bajo mínimo
              </Badge>
            ) : null}
          </div>
        </div>
        {level.percent === null ? null : <StockLevelBar percent={level.percent} label={`${level.measure}: ${level.percent} %`} hasStock={!empty} />}
        <p className="text-[13px] text-ink-muted">{level.note}</p>
      </div>
    </li>
  );
}
