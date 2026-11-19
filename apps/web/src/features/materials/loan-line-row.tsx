import { Button, Field, Input, Select } from '@platlab/ui';
import { Trash2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Combobox } from '../../app/combobox';
import { useMaterials } from './context';
import { useMaterialPage, useStock } from './queries';

/** Una línea del vale mientras se llena: el material elegido, de qué ubicación sale y cuánto. */
export interface DraftLine {
  key: string;
  productId: string | null;
  productLabel: string;
  positionId: string;
  quantity: string;
}

export const emptyLine = (): DraftLine => ({ key: crypto.randomUUID(), productId: null, productLabel: '', positionId: '', quantity: '' });

/**
 * Una línea de «Nuevo préstamo»: busca entre los materiales reutilizables con algo disponible, y de ahí la ubicación y la
 * cantidad. Solo se ofrece lo que está disponible hoy: lo ya prestado no se puede prestar de nuevo.
 */
export function LoanLineRow({
  line,
  index,
  onChange,
  onRemove,
  removable,
}: {
  line: DraftLine;
  index: number;
  onChange: (patch: Partial<DraftLine>) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const { workspaceId } = useMaterials();
  const found = useMaterialPage(workspaceId, { q: line.productId ? '' : line.productLabel, materialClass: 'reusable_counted' });
  const stock = useStock(workspaceId, line.productId);

  const options = useMemo(
    () =>
      (found.data?.pages.flatMap((page) => page.items) ?? [])
        .filter((material) => material.available !== '0')
        .map((material) => ({ id: material.id, label: material.name, keywords: material.code, detail: `${material.available} ${material.baseUnit} disponibles` })),
    [found.data],
  );
  const positions = useMemo(() => (stock.data?.items ?? []).filter((position) => position.available !== '0'), [stock.data]);
  const unit = positions[0]?.unit ?? 'u';

  // Con una sola ubicación con material disponible no hay nada que elegir.
  const onlyPosition = positions.length === 1 ? positions[0]?.positionId : undefined;
  useEffect(() => {
    if (onlyPosition && line.positionId !== onlyPosition) onChange({ positionId: onlyPosition });
  }, [onlyPosition, line.positionId, onChange]);

  const number = index + 1;
  return (
    <li className="grid gap-3 rounded-panel bg-surface-sunken p-3 sm:p-4">
      <div className="flex items-start gap-2">
        <Field label={`Material ${number}`} className="min-w-0 flex-1" required>
          <Combobox
            value={line.productLabel}
            onChange={(text) => onChange({ productLabel: text, productId: null, positionId: '' })}
            options={options}
            onPick={(option) => onChange({ productId: option.id, productLabel: option.label, positionId: '' })}
            placeholder="Busca un reutilizable por nombre"
            inputProps={{ className: 'h-11 sm:h-10' }}
          />
        </Field>
        {removable ? (
          <Button variant="ghost" className="mt-6 size-11 shrink-0 p-0 sm:size-10" aria-label={`Quitar el material ${number}`} onClick={onRemove}>
            <Trash2 aria-hidden />
          </Button>
        ) : null}
      </div>
      {line.productId ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Sale de" required>
            <Select
              value={line.positionId}
              onValueChange={(positionId) => onChange({ positionId })}
              placeholder={stock.isPending ? 'Cargando…' : positions.length === 0 ? 'Sin disponible' : 'Elige la ubicación'}
              options={positions.map((position) => ({ value: position.positionId, label: position.locationPath.join(' › '), detail: `${position.available} ${position.unit}` }))}
            />
          </Field>
          <Field label={`Cantidad (${unit})`} required>
            <Input inputMode="decimal" autoComplete="off" className="h-11 sm:h-10" value={line.quantity} onChange={(event) => onChange({ quantity: event.target.value })} />
          </Field>
        </div>
      ) : null}
    </li>
  );
}
