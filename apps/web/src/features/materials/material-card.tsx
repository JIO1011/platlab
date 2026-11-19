import type { StockedMaterial } from '@platlab/contracts';
import { Badge, Quantity } from '@platlab/ui';
import { ChevronRight } from 'lucide-react';
import { CodeTag } from '../../app/code-tag';
import { classLabels, lentOut } from './text';

/**
 * Un material en su tarjeta (ADR 0025): el nombre con su código y su clase; a la derecha lo disponible hoy, que es lo
 * que se puede sacar o prestar, y debajo la existencia y lo prestado. Toda la tarjeta abre su ficha.
 */
export function MaterialCard({ material, onOpen }: { material: StockedMaterial; onOpen: () => void }) {
  const lent = lentOut(material.balance, material.available);
  return (
    <li className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 rounded-card bg-surface px-4 py-4 shadow-raised transition-colors hover:bg-surface-sunken/40 has-[button:focus-visible]:outline-2 has-[button:focus-visible]:outline-offset-2 has-[button:focus-visible]:outline-action sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-5">
      <div className="min-w-0">
        <p className="break-words">
          <button type="button" aria-haspopup="dialog" onClick={onOpen} className="text-left font-semibold text-ink after:absolute after:inset-0 focus-visible:outline-none">
            {material.name}
          </button>
        </p>
        <ul className="mt-2 flex flex-wrap items-center gap-1.5">
          <li>
            <CodeTag>{material.code}</CodeTag>
          </li>
          <li>
            <Badge tone="info" className="px-2.5">
              {classLabels[material.class]}
            </Badge>
          </li>
          {material.belowMinimum ? (
            <li>
              <Badge tone="warning" className="px-2.5">
                Bajo mínimo
              </Badge>
            </li>
          ) : null}
        </ul>
      </div>
      <ChevronRight className="size-4 shrink-0 text-ink-subtle sm:order-last" aria-hidden />
      <div className="col-span-2 text-right sm:col-span-1">
        <p className="text-lg font-bold text-ink">
          <Quantity value={material.available} unit={material.baseUnit} />
          <span className="ml-1.5 text-[13px] font-medium text-ink-muted">disponible</span>
        </p>
        <p className="text-[13px] text-ink-muted">
          Existencia <Quantity value={material.balance} unit={material.baseUnit} />
          {lent !== '0' ? (
            <>
              {' · '}
              En préstamo <Quantity value={lent} unit={material.baseUnit} />
            </>
          ) : null}
        </p>
      </div>
    </li>
  );
}
