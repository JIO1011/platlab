import type { MaterialsDashboard } from '@platlab/contracts';
import { Quantity, Tabs, TabsContent, TabsList, TabsTrigger } from '@platlab/ui';

type Usage = MaterialsDashboard['topSupplies'][number];

/** Un puesto del ranking: el nombre, una barra en una sola tonalidad y el valor al final de la barra, en texto. */
function Ranking({ rows, value, empty }: { rows: Usage[]; value: (row: Usage) => number; empty: string }) {
  if (rows.length === 0) return <p className="py-4 text-sm text-ink-muted">{empty}</p>;
  const top = Math.max(...rows.map(value));
  return (
    <ol className="grid gap-3">
      {rows.map((row, index) => (
        <li key={row.productId} className="grid gap-1">
          <p className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-ink">
              <span className="mr-2 tabular-nums text-ink-subtle">{index + 1}</span>
              {row.name}
            </span>
            <span className="shrink-0 text-[13px] tabular-nums text-ink-muted">{row.events === 1 ? '1 vez' : `${row.events} veces`}</span>
          </p>
          <div className="flex items-center gap-3">
            <div aria-hidden className="h-2 flex-1 overflow-hidden rounded-full bg-action-soft">
              <div className="h-full rounded-full bg-action" style={{ width: `${top === 0 ? 0 : Math.max(4, (value(row) / top) * 100)}%` }} />
            </div>
            <b className="w-24 shrink-0 text-right text-[13px] font-semibold text-ink">
              <Quantity value={row.quantity} unit={row.baseUnit} />
            </b>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Lo más usado del periodo (ADR 0025): los insumos por cuántas salidas tuvieron y los reutilizables por cuántas unidades
 * se prestaron. Cada material va en su propia unidad: no se comparan gramos con piezas.
 */
export function TopUsed({ dashboard }: { dashboard: MaterialsDashboard }) {
  return (
    <Tabs defaultValue="supplies">
      <TabsList aria-label="Qué se usó más" className="mb-4 inline-flex gap-1 rounded-full bg-surface-sunken p-1">
        <TabsTrigger value="supplies" className="h-8 rounded-full px-3.5 text-sm font-medium text-ink-muted data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-raised">
          Insumos
        </TabsTrigger>
        <TabsTrigger value="reusables" className="h-8 rounded-full px-3.5 text-sm font-medium text-ink-muted data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-raised">
          Reutilizables
        </TabsTrigger>
      </TabsList>
      <TabsContent value="supplies">
        <Ranking rows={dashboard.topSupplies} value={(row) => row.events} empty="Aún no hubo salidas de insumos en este periodo." />
      </TabsContent>
      <TabsContent value="reusables">
        <Ranking rows={dashboard.topReusables} value={(row) => Number(row.quantity)} empty="Aún no se prestó material reutilizable en este periodo." />
      </TabsContent>
    </Tabs>
  );
}
