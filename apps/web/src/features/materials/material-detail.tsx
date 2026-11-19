import type { MaterialStockLine } from '@platlab/contracts';
import { Badge, Button, Quantity, Sheet, Skeleton, StatePanel, sectionLabel } from '@platlab/ui';
import { ArrowDownToLine, ArrowUpFromLine, BellRing, MapPinOff, Package, Pencil, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { CodeTag } from '../../app/code-tag';
import { QueryErrorState } from '../../app/states';
import { useMaterials } from './context';
import { MaterialSheet } from './material-sheet';
import { MinimumSheet } from './minimum-sheet';
import { MovementSheet, type Movement } from './movement-sheet';
import { useMaterial, useStock } from './queries';
import { classLabels, lentOut } from './text';

function Figure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-panel bg-surface-sunken px-4 py-3">
      <dt className="text-sm font-medium text-ink-muted">{label}</dt>
      <dd className="mt-1 break-words text-xl font-bold tracking-tight text-ink tabular-nums">{children}</dd>
    </div>
  );
}

/** Una ubicación con lo que tiene el material y las acciones que el rol permite sobre ella. */
function StockRow({ line, unit, onMove }: { line: MaterialStockLine; unit: string; onMove: (movement: Movement) => void }) {
  const { canIssue, canAdjust } = useMaterials();
  const lent = lentOut(line.balance, line.available);
  const canTake = canIssue && line.available !== '0';
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
      <div className="min-w-0">
        <p className="break-words font-medium text-ink">{line.locationPath.join(' › ')}</p>
        <p className="text-[13px] text-ink-muted">
          Existencia <Quantity value={line.balance} unit={unit} />
          {lent !== '0' ? (
            <>
              {' · '}
              En préstamo <Quantity value={lent} unit={unit} />
            </>
          ) : null}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-ink">
          <Quantity value={line.available} unit={unit} /> <span className="font-normal text-ink-muted">disponible</span>
        </span>
        {canTake ? (
          <Button className="h-11 sm:h-9" aria-haspopup="dialog" onClick={() => onMove({ kind: 'issue', line })}>
            <ArrowUpFromLine aria-hidden />
            Dar salida
          </Button>
        ) : null}
        {canAdjust ? (
          <Button className="h-11 sm:h-9" aria-haspopup="dialog" onClick={() => onMove({ kind: 'adjust', line })}>
            <SlidersHorizontal aria-hidden />
            Ajustar
          </Button>
        ) : null}
      </div>
    </li>
  );
}

/**
 * La ficha de un material (ADR 0025): sus cifras, sus existencias por ubicación y, según el rol, ingresar, dar salida,
 * ajustar, editar y fijar el mínimo. Cada acción abre su hoja encima; nada cambia hasta que el servidor confirma.
 */
export function MaterialDetailSheet({ productId, open, onOpenChange }: { productId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { workspaceId, canManage, canReceive } = useMaterials();
  const material = useMaterial(workspaceId, productId);
  const stock = useStock(workspaceId, productId);
  const [movement, setMovement] = useState<{ n: number; open: boolean; movement: Movement } | null>(null);
  const [editing, setEditing] = useState<{ n: number; open: boolean } | null>(null);
  const [minimum, setMinimum] = useState<{ n: number; open: boolean } | null>(null);
  const data = material.data;
  const lines = (stock.data?.items ?? []).filter((line) => line.balance !== '0');

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title={data?.name ?? 'Material'}
        description={data ? <span className="inline-flex flex-wrap items-center gap-2"><CodeTag>{data.code}</CodeTag> {classLabels[data.class]}</span> : undefined}
        icon={Package}
        wide
        footer={
          <div className="flex w-full flex-wrap justify-end gap-2">
            {canManage && data ? (
              <>
                <Button className="h-11 sm:h-10" aria-haspopup="dialog" onClick={() => setMinimum({ n: (minimum?.n ?? 0) + 1, open: true })}>
                  <BellRing aria-hidden />
                  Mínimo
                </Button>
                <Button className="h-11 sm:h-10" aria-haspopup="dialog" onClick={() => setEditing({ n: (editing?.n ?? 0) + 1, open: true })}>
                  <Pencil aria-hidden />
                  Editar
                </Button>
              </>
            ) : null}
            {canReceive && data ? (
              <Button variant="primary" className="h-11 sm:h-10" aria-haspopup="dialog" onClick={() => setMovement({ n: (movement?.n ?? 0) + 1, open: true, movement: { kind: 'receipt' } })}>
                <ArrowDownToLine aria-hidden />
                Ingresar existencias
              </Button>
            ) : null}
          </div>
        }
      >
        {material.isPending ? (
          <Skeleton className="h-48 rounded-card" />
        ) : material.isError || !data ? (
          <QueryErrorState error={material.error} onRetry={() => void material.refetch()} />
        ) : (
          <div className="grid gap-6">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Figure label="Existencia">
                <Quantity value={data.balance} unit={data.baseUnit} />
              </Figure>
              <Figure label="Disponible">
                <Quantity value={data.available} unit={data.baseUnit} />
              </Figure>
              <Figure label="En préstamo">
                <Quantity value={lentOut(data.balance, data.available)} unit={data.baseUnit} />
              </Figure>
              <Figure label="Mínimo">
                {data.minimum ? <Quantity value={data.minimum} unit={data.baseUnit} /> : <span className="text-base font-medium text-ink-muted">Sin mínimo</span>}
              </Figure>
            </dl>
            {data.belowMinimum ? <Badge tone="warning" className="w-fit px-2.5">Bajo mínimo: conviene reponerlo</Badge> : null}
            <section aria-labelledby="stock-title">
              <h3 id="stock-title" className={sectionLabel}>
                Existencias por ubicación
              </h3>
              {stock.isPending ? (
                <Skeleton className="mt-3 h-24 rounded-card" />
              ) : stock.isError ? (
                <QueryErrorState error={stock.error} onRetry={() => void stock.refetch()} />
              ) : lines.length === 0 ? (
                <StatePanel
                  icon={MapPinOff}
                  title="Sin existencias"
                  description={canReceive ? 'Aún no se ha ingresado este material. «Ingresar existencias» lo deja en una ubicación.' : 'Quien ingresa material lo dejará en una ubicación.'}
                  className="mt-3"
                />
              ) : (
                <ul className="mt-1 divide-y divide-line">
                  {lines.map((line) => (
                    <StockRow key={line.positionId} line={line} unit={data.baseUnit} onMove={(next) => setMovement({ n: (movement?.n ?? 0) + 1, open: true, movement: next })} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </Sheet>
      {data && movement ? (
        <MovementSheet
          key={movement.n}
          workspaceId={workspaceId}
          open={movement.open}
          onOpenChange={(next) => setMovement((current) => (current ? { ...current, open: next } : current))}
          material={{ id: data.id, name: data.name, baseUnit: data.baseUnit }}
          movement={movement.movement}
        />
      ) : null}
      {data && editing ? (
        <MaterialSheet
          key={editing.n}
          workspaceId={workspaceId}
          open={editing.open}
          onOpenChange={(next) => setEditing((current) => (current ? { ...current, open: next } : current))}
          material={data}
          unitEditable={data.unitEditable}
        />
      ) : null}
      {data && minimum ? (
        <MinimumSheet
          key={minimum.n}
          workspaceId={workspaceId}
          open={minimum.open}
          onOpenChange={(next) => setMinimum((current) => (current ? { ...current, open: next } : current))}
          productId={data.id}
          name={data.name}
          unit={data.baseUnit}
          minimum={data.minimum}
        />
      ) : null}
    </>
  );
}
