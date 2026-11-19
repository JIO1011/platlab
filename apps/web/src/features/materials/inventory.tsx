import type { MaterialClass } from '@platlab/contracts';
import { Button, Input, Segmented, Skeleton, StatePanel } from '@platlab/ui';
import { Package, PackageSearch, Plus } from 'lucide-react';
import { useState } from 'react';
import { SectionHeader } from '../../app/section-header';
import { QueryErrorState } from '../../app/states';
import { useMaterials } from './context';
import { MaterialCard } from './material-card';
import { MaterialDetailSheet } from './material-detail';
import { MaterialSheet } from './material-sheet';
import { useMaterialPage } from './queries';

type ClassFilter = 'all' | Extract<MaterialClass, 'consumable' | 'reusable_counted'>;

/**
 * Inventario de Materiales (ADR 0025): los materiales del espacio con lo disponible hoy, lo prestado y el aviso
 * «Bajo mínimo». Se filtra por clase (insumos o reutilizables) y se busca por nombre o código; tocar uno abre su ficha,
 * donde se ingresa, se da salida y se ajusta. El Administrador registra materiales nuevos.
 */
export function MaterialsInventoryPage() {
  const { workspaceId, canManage } = useMaterials();
  const [search, setSearch] = useState('');
  const [materialClass, setMaterialClass] = useState<ClassFilter>('all');
  const materials = useMaterialPage(workspaceId, { q: search, materialClass: materialClass === 'all' ? null : materialClass });
  const [form, setForm] = useState<{ n: number; open: boolean } | null>(null);
  const [detail, setDetail] = useState<{ id: string; open: boolean } | null>(null);
  const items = materials.data?.pages.flatMap((page) => page.items) ?? [];
  const filtered = search.trim().length >= 2 || materialClass !== 'all';

  const create = canManage ? (
    <Button variant="primary" className="h-12 sm:h-10" aria-haspopup="dialog" onClick={() => setForm({ n: (form?.n ?? 0) + 1, open: true })}>
      <Plus aria-hidden />
      Registrar material
    </Button>
  ) : null;

  return (
    <>
      <SectionHeader title="Inventario" updatedAt={materials.dataUpdatedAt} actions={create} />
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Segmented
          label="Clase de material"
          value={materialClass}
          onValueChange={setMaterialClass}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'consumable', label: 'Insumos' },
            { value: 'reusable_counted', label: 'Reutilizables' },
          ]}
        />
        <Input
          type="search"
          aria-label="Buscar material por nombre o código"
          placeholder="Buscar por nombre o código"
          autoComplete="off"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-11 min-w-0 flex-1 basis-60 sm:h-10"
        />
      </div>
      <div className="mt-4">
        {materials.isPending ? (
          <div aria-busy="true">
            <Skeleton className="h-64 rounded-card" />
          </div>
        ) : materials.isError ? (
          <div className="rounded-card bg-surface shadow-raised">
            <QueryErrorState error={materials.error} onRetry={() => void materials.refetch()} />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-card bg-surface shadow-raised">
            <StatePanel
              icon={filtered ? PackageSearch : Package}
              title={filtered ? 'Ningún material coincide' : 'Aún no hay materiales'}
              description={
                filtered
                  ? 'Prueba con otra palabra o quita el filtro de clase.'
                  : canManage
                    ? 'Registra lo que el laboratorio gasta (guantes, puntas) o presta (vasos, pipetas) y luego ingresa sus existencias.'
                    : 'Quien administra el espacio registra los materiales. Cuando existan, los verás aquí.'
              }
              action={filtered ? undefined : create}
            />
          </div>
        ) : (
          <>
            <ul className="grid gap-3 sm:gap-4">
              {items.map((material) => (
                <MaterialCard key={material.id} material={material} onOpen={() => setDetail({ id: material.id, open: true })} />
              ))}
            </ul>
            {materials.hasNextPage ? (
              <div className="mt-4 flex justify-center">
                <Button className="h-11 sm:h-10" onClick={() => void materials.fetchNextPage()} disabled={materials.isFetchingNextPage}>
                  {materials.isFetchingNextPage ? 'Cargando…' : 'Ver más'}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
      {detail ? (
        <MaterialDetailSheet
          key={detail.id}
          productId={detail.id}
          open={detail.open}
          onOpenChange={(open) => setDetail((current) => (current ? { ...current, open } : current))}
        />
      ) : null}
      {form ? (
        <MaterialSheet
          key={form.n}
          workspaceId={workspaceId}
          open={form.open}
          onOpenChange={(open) => setForm((current) => (current ? { ...current, open } : current))}
          onCreated={(created) => setDetail({ id: created.id, open: true })}
        />
      ) : null}
    </>
  );
}
