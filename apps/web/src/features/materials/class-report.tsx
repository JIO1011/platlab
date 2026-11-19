import type { MaterialsReport } from '@platlab/contracts';
import { Quantity } from '@platlab/ui';
import { HandHelping, Package } from 'lucide-react';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import { countText } from '../../app/format';

interface Figure {
  label: string;
  value: ReactNode;
  /** Color de la cifra cuando pide atención. */
  tone?: 'warning' | 'danger' | 'info' | undefined;
}

const toneClass = { warning: 'text-warning', danger: 'text-danger', info: 'text-action' } as const;

function ClassCard({ title, icon: Icon, materials, figures }: { title: string; icon: ComponentType<SVGProps<SVGSVGElement>>; materials: number; figures: Figure[] }) {
  return (
    <section aria-label={title} className="rounded-card bg-surface p-4 shadow-raised sm:p-5">
      <header className="flex items-center justify-between gap-3 border-b border-line pb-3">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <Icon className="size-4 text-ink-subtle" aria-hidden />
          {title}
        </h2>
        <span className="text-[13px] tabular-nums text-ink-muted">{countText(materials, 'material', 'materiales')}</span>
      </header>
      <dl className="mt-3 grid grid-cols-3 gap-3">
        {figures.map((figure) => (
          <div key={figure.label} className="min-w-0">
            <dt className="text-[12px] text-ink-muted">{figure.label}</dt>
            <dd className={`text-metric-sm tabular-nums ${figure.tone ? toneClass[figure.tone] : 'text-ink'}`}>{figure.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const attention = (n: number, tone: 'warning' | 'danger') => (n > 0 ? tone : undefined);

/**
 * El estado por clase, hoy (MA-01d): insumos (bajo mínimo, por vencer y agotados, en materiales: sus unidades no se
 * suman) y reutilizables (piezas en el estante, prestadas y dadas de baja desde el inicio).
 */
export function ClassReport({ report }: { report: MaterialsReport }) {
  const { consumable, reusable } = report;
  return (
    <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
      <ClassCard
        title="Insumos (se gastan)"
        icon={Package}
        materials={consumable.materials}
        figures={[
          { label: 'Bajo mínimo', value: consumable.belowMinimum, tone: attention(consumable.belowMinimum, 'warning') },
          { label: 'Por vencer', value: consumable.expiring, tone: attention(consumable.expiring, 'warning') },
          { label: 'Agotados', value: consumable.empty, tone: attention(consumable.empty, 'danger') },
        ]}
      />
      <ClassCard
        title="Material reutilizable (se presta)"
        icon={HandHelping}
        materials={reusable.materials}
        figures={[
          { label: 'En el estante', value: <Quantity value={reusable.onShelf} unit="u" unitClassName="text-sm" /> },
          { label: 'Prestadas', value: <Quantity value={reusable.lent} unit="u" unitClassName="text-sm" />, tone: reusable.lent === '0' ? undefined : 'info' },
          {
            label: 'Bajas',
            value: <Quantity value={reusable.writtenOff} unit="u" unitClassName="text-sm" />,
            tone: reusable.writtenOff === '0' ? undefined : 'danger',
          },
        ]}
      />
    </div>
  );
}
