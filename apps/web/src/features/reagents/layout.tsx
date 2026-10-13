import type { Position } from '@platlab/contracts';
import { Button, cn } from '@platlab/ui';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { ArrowUpFromLine, Eye, PackagePlus, RefreshCw, Scale } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router';
import { moduleApps, useShell } from '../../app/app-shell';
import { formatAgo } from '../../app/format';
import { parseMovementFilters, toOperationQuery } from './movement-filters';
import {
  useIssueRequests,
  useOperationFacets,
  useOperations,
  useOperationTotals,
  usePositions,
  useProducts,
  useReagentsKey,
  useReagentsSummary,
} from './queries';
import { QueryErrorState } from '../../app/states';
import { type Allowed, type ReagentsContext, type SheetRequest } from './context';
import { IngressSheet } from './ingress/ingress-sheet';
import { AdjustmentSheet, IssueSheet, MinimumSheet, ProductSheet, TareSheet, TransferSheet } from './sheets';
import { useNow } from './use-now';

/**
 * La hoja se monta de nuevo en cada apertura (clave nueva: formulario limpio y clave idempotente
 * nueva) y sigue montada al cerrarse para que su salida pueda animarse.
 */
function useSheets() {
  const [state, setState] = useState<{ open: boolean; id: number; request: SheetRequest } | null>(null);
  return {
    current: state,
    open: (request: SheetRequest) => setState((previous) => ({ open: true, id: (previous?.id ?? 0) + 1, request })),
    close: () => setState((previous) => (previous ? { ...previous, open: false } : previous)),
  };
}

/**
 * La app de Reactivos (ADR 0011): una cabecera común con el título de la sección, las acciones que
 * permite el rol y las hojas de registro; cada sección se dibuja debajo. Las acciones viven aquí
 * para que registrar una salida esté a un clic desde cualquier sección.
 */
export function ReagentsLayout() {
  const { workspaceId, me } = useShell();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const reagentsKey = useReagentsKey(workspaceId);
  // Filtros de Movimientos en la URL (ADR 0014): la cifra del Resumen abre exactamente su lista.
  const movementFilters = useMemo(() => parseMovementFilters(params), [params]);
  const operationQuery = toOperationQuery(movementFilters, me.workspace.timeZone);
  const products = useProducts(workspaceId);
  const positions = usePositions(workspaceId);
  const operations = useOperations(workspaceId, operationQuery);
  const sheets = useSheets();
  const now = useNow(15_000);

  const module = me.modules.find((entry) => entry.code === 'reagents');
  const canOperate = module?.access.includes('new_operation') ?? false;
  const can = (permission: string) => canOperate && me.permissions.includes(permission);
  const allowed: Allowed = {
    product: can('reagents.catalog.manage'),
    receipt: can('reagents.receipt.create'),
    issue: can('reagents.issue.create'),
    adjustment: can('reagents.adjustment.create'),
    lists: can('reagents.catalog.manage'),
    approve: can('reagents.issue.approve'),
    transfer: can('reagents.transfer.create'),
  };
  const canResolve = module?.access.includes('resolve_pending') ?? false;

  const app = moduleApps(me).find((entry) => entry.code === 'reagents');
  const base = `/e/${workspaceId}/${app?.path ?? 'reactivos'}`;
  const [sectionPath = '', detailId] = pathname.slice(base.length + 1).split('/');
  const section = app?.sections.find((entry) => entry.path === sectionPath);
  // El Resumen es la portada de la app: lleva el nombre del módulo; las demás, el de su sección.
  const productList = products.data?.items ?? [];
  // La ficha (inventario/:id, ADR 0012) lleva el nombre del reactivo; el Resumen, el del módulo.
  const detailName = detailId ? productList.find((entry) => entry.id === detailId)?.name : undefined;
  const title =
    detailId !== undefined
      ? (detailName ?? 'Reactivo')
      : sectionPath === ''
        ? (module?.name ?? 'Reactivos')
        : (section?.label ?? module?.name ?? 'Reactivos');
  const summary = useReagentsSummary(workspaceId, sectionPath === '');
  const requests = useIssueRequests(workspaceId, params.get('estado') === 'todas', sectionPath === 'solicitudes');
  const operationFacets = useOperationFacets(workspaceId, operationQuery, '', sectionPath === 'movimientos');
  const operationTotals = useOperationTotals(
    workspaceId,
    me,
    operationQuery,
    movementFilters.groupBy,
    sectionPath === 'movimientos' && movementFilters.view === 'totals',
  );

  const positionList = useMemo(() => positions.data?.pages.flatMap((page) => page.items) ?? [], [positions.data]);
  // Por debajo de 1024 px (móvil y tableta), la primaria ocupa su fila y las secundarias van de dos
  // en dos: si son impares, la última toma la fila entera para no dejar un hueco.
  // En la ficha (ADR 0012) las acciones se acotan a ese reactivo: ingreso y salida con él ya elegido;
  // «Ajustar» vive en cada frasco.
  const inProduct = detailId !== undefined;
  // En la página de etiquetas la tarea es imprimir: sin acciones de registro en la cabecera.
  const inLabels = pathname.endsWith('/etiquetas');
  const secondaryActions = [
    // «Ingresar reactivo» (ADR 0015): el ingreso en un paso, con reactivo nuevo o del catálogo.
    { kind: 'ingress', label: inProduct ? 'Ingresar frascos' : 'Ingresar reactivo', icon: PackagePlus, shown: allowed.receipt },
    { kind: 'adjustment', label: 'Ajustar', icon: Scale, shown: allowed.adjustment && positionList.length > 0 && !inProduct },
  ] as const;
  const visibleSecondary = secondaryActions.filter((action) => action.shown);
  // «Actualizado hace…» informa lo más antiguo de lo que la sección muestra, nunca lo más fresco.
  const shown: Array<{ dataUpdatedAt: number }> =
    sectionPath === ''
      ? [summary]
      : sectionPath === 'movimientos'
        ? [operations]
        : sectionPath === 'solicitudes'
          ? [requests]
          : [products, positions];
  const stamps = shown.map((query) => query.dataUpdatedAt).filter((stamp) => stamp > 0);
  const updatedAt = stamps.length === shown.length ? Math.min(...stamps) : 0;
  const refreshing = useIsFetching({ queryKey: reagentsKey }) > 0;

  if (products.isError || positions.isError) {
    return (
      <QueryErrorState
        error={products.error ?? positions.error}
        onRetry={() => {
          void products.refetch();
          void positions.refetch();
        }}
      />
    );
  }

  const current = sheets.current;
  const sheetProps = (kind: SheetRequest['kind']) => ({
    workspaceId,
    open: current?.open === true && current.request.kind === kind,
    onOpenChange: (open: boolean) => {
      if (!open) sheets.close();
    },
  });

  // El Resumen cabe en una ventana en escritorio (ADR 0012, 05-10-2026): ocupa el alto que deja el
  // shell (barra superior y rellenos del main) y reparte el resto entre sus tarjetas.
  const fitsWindow = sectionPath === '' && detailId === undefined;

  return (
    <div className={cn('mx-auto max-w-6xl', inProduct && 'relative isolate', fitsWindow && 'fit:flex fit:h-[calc(100dvh-8rem-1px)] fit:flex-col')}>
      {inProduct ? (
        // Fondo de la ficha: un brillo del índigo del módulo, arriba y a la izquierda, que se pierde hacia abajo.
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-4 -top-8 -z-10 h-[34rem] bg-[radial-gradient(48rem_26rem_at_0%_0%,color-mix(in_oklab,var(--color-action)_17%,transparent),transparent_70%),radial-gradient(34rem_20rem_at_85%_0%,color-mix(in_oklab,var(--color-action-deep)_8%,transparent),transparent_70%)] md:-inset-x-8"
        />
      ) : null}
      {/* La ficha dibuja su propia cabecera (identidad, acciones y «Actualizar»). */}
      {inProduct ? null : (
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className={cn('min-w-0', fitsWindow && 'fit:flex fit:flex-wrap fit:items-baseline fit:gap-x-4')}>
          <h1 className="text-display text-ink">{title}</h1>
          <p className={cn('mt-1 flex items-center gap-2 text-[13px] text-ink-muted', fitsWindow && 'fit:mt-0')}>
            {updatedAt > 0 ? <span>Actualizado {formatAgo(updatedAt, now)}</span> : <span>Cargando…</span>}
            <button
              type="button"
              // Todo lo de Reactivos: las consultas activas se vuelven a pedir y las demás quedan viejas.
              onClick={() => void queryClient.invalidateQueries({ queryKey: reagentsKey })}
              className="inline-flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 font-medium text-action transition-colors hover:bg-action-soft"
            >
              <RefreshCw className="size-3.5" aria-hidden />
              {refreshing ? 'Actualizando…' : 'Actualizar'}
            </button>
          </p>
        </div>
        {/* En el Resumen, la tarjeta de acción rápida hace de acciones (ADR 0010, 04-10-2026); en Solicitudes, la tarea es decidir, y «Aprobar salida» es la primaria. */}
        {sectionPath !== '' && sectionPath !== 'solicitudes' && !inLabels ? (
          <div className="grid w-full grid-cols-2 gap-2 lg:flex lg:w-auto lg:flex-wrap">
            {visibleSecondary.map(({ kind, label, icon: Icon }, index) => (
              <Button
                key={kind}
                className={cn(index === visibleSecondary.length - 1 && index % 2 === 0 && 'col-span-2 lg:col-span-1')}
                onClick={() => sheets.open(kind === 'ingress' && detailId ? { kind, productId: detailId } : { kind })}
              >
                <Icon aria-hidden />
                {label}
              </Button>
            ))}
            {allowed.issue && positionList.length > 0 ? (
              <Button
                variant="primary"
                className="order-first col-span-2 lg:order-none"
                onClick={() => sheets.open(detailId ? { kind: 'issue', productId: detailId } : { kind: 'issue' })}
              >
                <ArrowUpFromLine aria-hidden />
                {allowed.approve ? 'Registrar salida' : 'Solicitar salida'}
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>
      )}

      {!canOperate ? (
        <p role="status" className="mt-5 flex items-center gap-2 rounded-control bg-warning-soft px-3 py-2.5 text-sm text-warning">
          <Eye className="size-4 shrink-0" aria-hidden />
          Reactivos está en modo consulta: puedes ver el inventario y el historial, pero no registrar movimientos.
        </p>
      ) : null}

      <div className={cn(inProduct ? 'mt-0' : 'mt-6', fitsWindow && 'fit:mt-3 fit:min-h-0 fit:flex-1 fit-tall:mt-6')}>
        <Outlet
          context={
            {
              workspaceId,
              me,
              base,
              allowed,
              products,
              productList,
              positions,
              positionList,
              operations,
              movementFilters,
              operationQuery,
              operationFacets,
              operationTotals,
              summary,
              requests,
              canResolve,
              openSheet: sheets.open,
              freshness: { updatedAt, refreshing, refresh: () => void queryClient.invalidateQueries({ queryKey: reagentsKey }) },
            } satisfies ReagentsContext
          }
        />
      </div>

      {current?.request.kind === 'ingress' ? (
        <IngressSheet
          key={current.id}
          {...sheetProps('ingress')}
          products={productList}
          productId={current.request.productId}
          canCreate={allowed.product}
          canManageLists={allowed.lists}
          base={base}
        />
      ) : null}
      {current?.request.kind === 'issue' ? (
        <IssueSheet
          key={current.id}
          {...sheetProps('issue')}
          positions={withPosition(positionList, current.request.position)}
          positionId={current.request.positionId}
          productId={current.request.productId}
          timeZone={me.workspace.timeZone}
          canManageLists={allowed.lists}
          needsApproval={!allowed.approve}
        />
      ) : null}
      {current?.request.kind === 'minimum' ? (
        <MinimumSheet
          key={current.id}
          {...sheetProps('minimum')}
          product={productList.find((entry) => entry.id === (current.request.kind === 'minimum' ? current.request.productId : ''))}
        />
      ) : null}
      {current?.request.kind === 'product' ? (
        <ProductSheet key={current.id} {...sheetProps('product')} product={current.request.product} />
      ) : null}
      {current?.request.kind === 'tare' ? (
        <TareSheet
          key={current.id}
          {...sheetProps('tare')}
          position={current.request.position}
          productDensity={productList.find((entry) => entry.id === (current.request.kind === 'tare' ? current.request.position.product.id : ''))?.density ?? null}
        />
      ) : null}
      {current?.request.kind === 'transfer' ? (
        <TransferSheet
          key={current.id}
          {...sheetProps('transfer')}
          position={current.request.position}
        />
      ) : null}
      {current?.request.kind === 'adjustment' ? (
        <AdjustmentSheet
          key={current.id}
          {...sheetProps('adjustment')}
          positions={positionList}
          positionId={current.request.positionId}
          canManageLists={allowed.lists}
          onAction={sheets.open}
        />
      ) : null}
    </div>
  );
}

/** La lista de frascos con el que llegó en la petición, si no estaba (la global llega por páginas). */
function withPosition(list: Position[], position: Position | undefined): Position[] {
  return position && !list.some((entry) => entry.id === position.id) ? [position, ...list] : list;
}
