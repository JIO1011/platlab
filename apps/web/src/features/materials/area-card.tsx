import type { MaterialArea } from '@platlab/contracts';
import { Badge, IconChip } from '@platlab/ui';
import { MapPin, Repeat2 } from 'lucide-react';
import { countText } from '../../app/format';
import { ModuleMark } from '../../app/module-mark';

/**
 * Un área en el Inventario «Por ubicación» (ADR 0025), con la forma de la de Equipos: su nombre, cuántos materiales hay
 * en ella en grande y, si alguno anda prestado, el aviso. Toda la tarjeta abre la lista de esa área.
 */
export function AreaCard({ area, onOpen }: { area: MaterialArea; onOpen: () => void }) {
  return (
    <li className="group relative flex flex-col gap-4 overflow-hidden rounded-[20px] bg-surface p-5 shadow-raised transition-[transform,box-shadow] duration-200 ease-out-expo hover:shadow-float has-[button:focus-visible]:outline-2 has-[button:focus-visible]:outline-offset-2 has-[button:focus-visible]:outline-action motion-safe:hover:-translate-y-1">
      <ModuleMark
        code="materials"
        className="pointer-events-none absolute -bottom-5 -right-4 size-28 rotate-12 text-surface-sunken transition-[color,transform] duration-500 group-hover:text-action-soft motion-safe:group-hover:scale-110"
      />
      <div className="relative flex min-w-0 items-center gap-3">
        <IconChip icon={MapPin} />
        <h2 className="min-w-0 text-balance break-words text-[17px] font-bold leading-tight tracking-tight text-ink transition-colors group-hover:text-action">
          <button type="button" onClick={onOpen} className="text-left after:absolute after:inset-0 focus-visible:outline-none">
            {area.name}
          </button>
        </h2>
      </div>
      <div className="relative grid gap-2">
        <p className="flex items-baseline gap-2">
          <span className="text-metric tabular-nums text-ink">{area.materials}</span>
          <span className="text-sm font-medium text-ink-muted">{area.materials === 1 ? 'material' : 'materiales'}</span>
        </p>
        {area.lentMaterials > 0 ? (
          <Badge tone="info" className="w-fit gap-1 px-2 py-0.5 text-[11px]">
            <Repeat2 className="size-3" aria-hidden />
            {countText(area.lentMaterials, 'con préstamo', 'con préstamos')}
          </Badge>
        ) : (
          <p className="text-[13px] text-ink-muted">Todo en el estante</p>
        )}
      </div>
    </li>
  );
}
