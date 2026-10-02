import type { Operation, Position, ProductList, ReagentsSummary, WorkspaceMeResponse } from '@platlab/contracts';
import {
  Badge,
  Button,
  Quantity,
  Skeleton,
  StatePanel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@platlab/ui';
import { useIsFetching, useQueryClient, type InfiniteData, type UseInfiniteQueryResult, type UseQueryResult } from '@tanstack/react-query';
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import { ArrowDownToLine, ArrowUpFromLine, ChevronRight, Eye, FlaskConical, History, Plus, RefreshCw, Scale, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useOutletContext, useSearchParams } from 'react-router';
import { ActivityRow } from '../../app/activity-row';
import { moduleApps, useShell } from '../../app/app-shell';
import { formatAgo, formatDate, formatDateTime } from '../../app/format';
import {
  useOperations,
  usePositions,
  useProducts,
  useReagentsKey,
  useReagentsSummary,
  type OperationFilter,
} from '../../app/queries';
import { QueryErrorState } from '../../app/states';
import { TrendChart } from '../../app/trend-chart';
import { AdjustmentSheet, IssueSheet, NewLotSheet, NewProductSheet, ReceiptSheet } from './sheets';

type SheetRequest =
  | { kind: 'product' }
  | { kind: 'lot'; productId?: string }
  | { kind: 'receipt'; productId?: string }
  | { kind: 'issue'; positionId?: string }
  | { kind: 'adjustment'; positionId?: string };

type Allowed = Record<'product' | 'receipt' | 'issue' | 'adjustment', boolean>;

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

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** Lo que las secciones comparten: datos ya pedidos, permisos y la apertura de hojas. */
interface ReagentsContext {
  workspaceId: string;
  me: WorkspaceMeResponse;
  base: string;
  allowed: Allowed;
  products: UseQueryResult<ProductList>;
  productList: StockedProduct[];
  positions: UseInfiniteQueryResult<InfiniteData<{ items: Position[] }>>;
  positionList: Position[];
  operations: UseInfiniteQueryResult<InfiniteData<{ items: Operation[] }>>;
  operationFilter: OperationFilter;
  summary: UseQueryResult<ReagentsSummary>;
  openSheet: (request: SheetRequest) => void;
}

/**
 * Filtro del historial en la URL, para que la cifra del Resumen abra exactamente su lista:
 * `?tipo=salida&dias=30` son las salidas de los últimos 30 días, la misma ventana del gráfico.
 */
const typeParams = { ingreso: 'receipt', salida: 'issue', ajuste: 'adjustment' } as const;

function readOperationFilter(params: URLSearchParams): OperationFilter {
  const type = typeParams[params.get('tipo') as keyof typeof typeParams] as OperationFilter['type'];
  const days = Number(params.get('dias'));
  return { type, days: Number.isInteger(days) && days >= 1 && days <= 90 ? days : undefined };
}

const useReagents = () => useOutletContext<ReagentsContext>();

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
  const operationFilter = readOperationFilter(params);
  const products = useProducts(workspaceId);
  const positions = usePositions(workspaceId);
  const operations = useOperations(workspaceId, operationFilter);
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
  };

  const app = moduleApps(me).find((entry) => entry.code === 'reagents');
  const base = `/e/${workspaceId}/${app?.path ?? 'reactivos'}`;
  const sectionPath = pathname.slice(base.length + 1).split('/')[0] ?? '';
  const section = app?.sections.find((entry) => entry.path === sectionPath);
  // El Resumen es la portada de la app: lleva el nombre del módulo; las demás, el de su sección.
  const title = sectionPath === '' ? (module?.name ?? 'Reactivos') : (section?.label ?? module?.name ?? 'Reactivos');
  const summary = useReagentsSummary(workspaceId, sectionPath === '');

  const positionList = useMemo(() => positions.data?.pages.flatMap((page) => page.items) ?? [], [positions.data]);
  const productList = products.data?.items ?? [];
  // Por debajo de 1024 px (móvil y tableta), la primaria ocupa su fila y las secundarias van de dos
  // en dos: si son impares, la última toma la fila entera para no dejar un hueco.
  const secondaryActions = [
    { kind: 'product', label: 'Nuevo reactivo', icon: Plus, shown: allowed.product },
    { kind: 'receipt', label: 'Registrar ingreso', icon: ArrowDownToLine, shown: allowed.receipt },
    { kind: 'adjustment', label: 'Ajustar', icon: Scale, shown: allowed.adjustment && positionList.length > 0 },
  ] as const;
  const visibleSecondary = secondaryActions.filter((action) => action.shown);
  // «Actualizado hace…» informa lo más antiguo de lo que la sección muestra, nunca lo más fresco.
  const shown: Array<{ dataUpdatedAt: number }> =
    sectionPath === '' ? [summary] : sectionPath === 'movimientos' ? [operations] : [products, positions];
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

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display text-ink">{title}</h1>
          <p className="mt-1 flex items-center gap-2 text-[13px] text-ink-muted">
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
        <div className="grid w-full grid-cols-2 gap-2 lg:flex lg:w-auto lg:flex-wrap">
          {visibleSecondary.map(({ kind, label, icon: Icon }, index) => (
            <Button
              key={kind}
              className={cn(index === visibleSecondary.length - 1 && index % 2 === 0 && 'col-span-2 lg:col-span-1')}
              onClick={() => sheets.open({ kind })}
            >
              <Icon aria-hidden />
              {label}
            </Button>
          ))}
          {allowed.issue && positionList.length > 0 ? (
            <Button variant="primary" className="order-first col-span-2 lg:order-none" onClick={() => sheets.open({ kind: 'issue' })}>
              <ArrowUpFromLine aria-hidden />
              Registrar salida
            </Button>
          ) : null}
        </div>
      </header>

      {!canOperate ? (
        <p role="status" className="mt-5 flex items-center gap-2 rounded-control bg-warning-soft px-3 py-2.5 text-sm text-warning">
          <Eye className="size-4 shrink-0" aria-hidden />
          Reactivos está en modo consulta: puedes ver el inventario y el historial, pero no registrar movimientos.
        </p>
      ) : null}

      <div className="mt-6">
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
              operationFilter,
              summary,
              openSheet: sheets.open,
            } satisfies ReagentsContext
          }
        />
      </div>

      {current?.request.kind === 'product' ? <NewProductSheet key={current.id} {...sheetProps('product')} /> : null}
      {current?.request.kind === 'lot' ? (
        <NewLotSheet key={current.id} {...sheetProps('lot')} products={productList} productId={current.request.productId} />
      ) : null}
      {current?.request.kind === 'receipt' ? (
        <ReceiptSheet key={current.id} {...sheetProps('receipt')} products={productList} productId={current.request.productId} />
      ) : null}
      {current?.request.kind === 'issue' ? (
        <IssueSheet key={current.id} {...sheetProps('issue')} positions={positionList} positionId={current.request.positionId} />
      ) : null}
      {current?.request.kind === 'adjustment' ? (
        <AdjustmentSheet key={current.id} {...sheetProps('adjustment')} positions={positionList} positionId={current.request.positionId} />
      ) : null}
    </div>
  );
}

const counterLabels = {
  productsWithStock: (n: number) => (n === 1 ? 'Reactivo con existencias' : 'Reactivos con existencias'),
  positionsWithStock: (n: number) => (n === 1 ? 'Ubicación con existencias' : 'Ubicaciones con existencias'),
};

/** Una cifra del Resumen que abre la lista que la explica (ADR 0011). */
function StatLink({ to, value, label }: { to: string; value: number; label: string }) {
  return (
    // Por debajo de 1024 px, una fila compacta (cifra a la derecha); desde lg, una tarjeta con la
    // cifra grande. En tableta, tres tarjetas estrechas partirían sus etiquetas en varias líneas.
    <Link
      to={to}
      className="group flex items-center justify-between gap-4 rounded-card bg-surface px-5 py-4 shadow-raised transition-shadow duration-150 hover:shadow-float lg:flex-col lg:items-stretch lg:gap-6 lg:p-6"
    >
      <span className="flex items-center gap-1.5 text-sm font-medium text-ink-muted lg:justify-between">
        {label}
        {/* Señal de enlace siempre visible; se enciende con el puntero o el foco. */}
        <ChevronRight
          className="size-4 shrink-0 text-ink-subtle transition-colors group-hover:text-action group-focus-visible:text-action"
          aria-hidden
        />
      </span>
      <span className="text-metric-sm text-ink lg:text-metric">{value}</span>
    </Link>
  );
}

/** Resumen: las cifras del módulo, las salidas por día y la actividad reciente, en su ámbito. */
export function ReagentsSummaryPage() {
  const { me, base, summary } = useReagents();

  if (summary.isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3" aria-busy="true" aria-label="Cargando">
        <Skeleton className="h-32 rounded-card" />
        <Skeleton className="h-32 rounded-card" />
        <Skeleton className="h-32 rounded-card" />
      </div>
    );
  }
  if (summary.isError) return <QueryErrorState error={summary.error} onRetry={() => void summary.refetch()} />;

  const { summary: counters, trend, activity } = summary.data;
  const issues = trend?.points.reduce((sum, point) => sum + point.value, 0) ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4">
        <StatLink to={`${base}/inventario`} value={counters.productsWithStock} label={counterLabels.productsWithStock(counters.productsWithStock)} />
        <StatLink to={`${base}/inventario`} value={counters.positionsWithStock} label={counterLabels.positionsWithStock(counters.positionsWithStock)} />
        <StatLink to={`${base}/movimientos?tipo=salida&dias=30`} value={issues} label="Salidas, últimos 30 días" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
        <article className="min-w-0 rounded-card bg-surface p-5 shadow-raised sm:p-6 lg:col-span-7">
          <h2 className="text-lg font-semibold text-ink">Salidas por día</h2>
          <p className="mt-1 text-sm text-ink-muted">Últimos 30 días, en las ubicaciones que puedes consultar.</p>
          <div className="mt-8">
            {trend ? (
              <TrendChart title="Salidas por día, últimos 30 días" points={trend.points} unit={{ one: 'salida', many: 'salidas' }} />
            ) : (
              // Sin salidas no hay gráfico: uno vacío no informa (ADR 0011).
              <p className="rounded-panel bg-surface-sunken px-4 py-6 text-center text-sm text-ink-muted">
                No hubo salidas en los últimos 30 días.
              </p>
            )}
          </div>
        </article>
        <article className="min-w-0 rounded-card bg-surface p-5 shadow-raised sm:p-6 lg:col-span-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-ink">Actividad reciente</h2>
            <Link to={`${base}/movimientos`} className="whitespace-nowrap text-sm font-medium text-action">
              Ver movimientos
            </Link>
          </div>
          {activity.length ? (
            <ul className="mt-3 divide-y divide-line">
              {activity.map((entry) => (
                <li key={entry.id} className="py-3">
                  <ActivityRow {...entry} timeZone={me.workspace.timeZone} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-ink-muted">Todavía no hay movimientos en tus ubicaciones.</p>
          )}
        </article>
      </div>
    </div>
  );
}

/** Inventario: producto → lote → ubicación (01 §7), con sus acciones por fila. */
export function ReagentsInventoryPage() {
  const { allowed, products, productList, positions, positionList, openSheet } = useReagents();
  return (
    <div className="overflow-hidden rounded-card bg-surface shadow-raised">
      {products.isPending || positions.isPending ? (
        <TableSkeleton />
      ) : productList.length === 0 ? (
        <StatePanel
          icon={FlaskConical}
          title="Aún no hay reactivos"
          description={
            allowed.product
              ? 'Crea el primer reactivo del catálogo; después podrás registrar sus lotes e ingresos.'
              : 'Cuando alguien con permiso cree reactivos en el catálogo, aparecerán aquí.'
          }
          action={
            allowed.product ? (
              <Button variant="primary" onClick={() => openSheet({ kind: 'product' })}>
                <Plus aria-hidden />
                Nuevo reactivo
              </Button>
            ) : undefined
          }
        />
      ) : (
        <InventoryTable products={productList} positions={positionList} allowed={allowed} onAction={openSheet} />
      )}
      {positions.hasNextPage ? (
        <div className="border-t border-line p-3 text-center">
          <Button variant="ghost" size="sm" loading={positions.isFetchingNextPage} onClick={() => void positions.fetchNextPage()}>
            Cargar más ubicaciones
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Movimientos: el historial completo, del más reciente al más antiguo, con su responsable. */
const filterLabels: Record<NonNullable<OperationFilter['type']>, string> = {
  receipt: 'Ingresos',
  issue: 'Salidas',
  adjustment: 'Ajustes',
};

export function ReagentsMovementsPage() {
  const { me, operations, operationFilter } = useReagents();
  const [, setParams] = useSearchParams();
  const label = [
    operationFilter.type ? filterLabels[operationFilter.type] : null,
    operationFilter.days ? `últimos ${operationFilter.days} días` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <>
      {label ? (
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex h-9 items-center gap-1 rounded-full bg-action-soft pl-3.5 pr-1 text-sm font-medium text-action">
            {label.charAt(0).toUpperCase() + label.slice(1)}
            <button
              type="button"
              aria-label={`Quitar el filtro: ${label}`}
              onClick={() => setParams({}, { replace: true })}
              className="inline-flex size-7 items-center justify-center rounded-full transition-colors hover:bg-action/10"
            >
              <X className="size-4" aria-hidden />
            </button>
          </span>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-card bg-surface shadow-raised">
        {operations.isPending ? (
          <TableSkeleton />
        ) : operations.isError ? (
          <QueryErrorState error={operations.error} onRetry={() => void operations.refetch()} />
        ) : (
          <MovementsView
            operations={operations.data.pages.flatMap((page) => page.items)}
            timeZone={me.workspace.timeZone}
            filtered={Boolean(label)}
          />
        )}
        {operations.hasNextPage ? (
          <div className="border-t border-line p-3 text-center">
            <Button variant="ghost" size="sm" loading={operations.isFetchingNextPage} onClick={() => void operations.fetchNextPage()}>
              Cargar movimientos anteriores
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}

function TableSkeleton() {
  return (
    <div className="grid gap-3 p-5" aria-busy="true" aria-label="Cargando">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex items-center gap-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/5" />
          <Skeleton className="h-4 w-1/5" />
          <Skeleton className="ml-auto h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

type StockedProduct = ProductList['items'][number];

/** Producto → lote → ubicación (01 §7), con el saldo como columna dominante. */
function InventoryTable({
  products,
  positions,
  allowed,
  onAction,
}: {
  products: StockedProduct[];
  positions: Position[];
  allowed: Allowed;
  onAction: (request: SheetRequest) => void;
}) {
  const byProduct = new Map<string, Position[]>();
  for (const position of positions) {
    const list = byProduct.get(position.product.id) ?? [];
    list.push(position);
    byProduct.set(position.product.id, list);
  }

  return (
    <>
      <div className="hidden lg:block">
        <InventoryGrid products={products} byProduct={byProduct} allowed={allowed} onAction={onAction} />
      </div>
      <div className="lg:hidden">
        <InventoryList products={products} byProduct={byProduct} allowed={allowed} onAction={onAction} />
      </div>
    </>
  );
}

interface InventoryViewProps {
  products: StockedProduct[];
  byProduct: Map<string, Position[]>;
  allowed: Record<'product' | 'receipt' | 'issue' | 'adjustment', boolean>;
  onAction: (request: SheetRequest) => void;
}

/** «Caducidad sin confirmar» siempre se diseña (01 §7): con texto y color, no solo en gris. */
function Expiry({ position }: { position: Position }) {
  return position.lot.expiresOn ? (
    <span className="text-[12px] text-ink-muted">Caduca {formatDate(position.lot.expiresOn)}</span>
  ) : (
    <Badge tone="warning">Caducidad desconocida</Badge>
  );
}

function ProductHeading({ product }: { product: StockedProduct }) {
  return (
    <>
      <span className="font-semibold text-ink">{product.name}</span>
      <span className="mt-0.5 flex flex-wrap gap-x-2 text-[13px] font-normal text-ink-muted">
        <span className="whitespace-nowrap">{product.code}</span>
        {product.casNumber ? <span className="whitespace-nowrap">CAS {product.casNumber}</span> : null}
      </span>
    </>
  );
}

function ProductActions({ product, allowed, onAction }: Omit<InventoryViewProps, 'products' | 'byProduct'> & { product: StockedProduct }) {
  return (
    <>
      {allowed.product ? (
        <Button size="sm" variant="ghost" className="max-lg:h-11" onClick={() => onAction({ kind: 'lot', productId: product.id })}>
          Nuevo lote
        </Button>
      ) : null}
      {allowed.receipt ? (
        <Button size="sm" variant="ghost" className="max-lg:h-11" onClick={() => onAction({ kind: 'receipt', productId: product.id })}>
          Ingreso
        </Button>
      ) : null}
    </>
  );
}

function PositionActions({ position, allowed, onAction }: Omit<InventoryViewProps, 'products' | 'byProduct'> & { position: Position }) {
  return (
    <>
      {allowed.issue && position.balance !== '0' ? (
        <Button size="sm" variant="ghost" className="max-lg:h-11" onClick={() => onAction({ kind: 'issue', positionId: position.id })}>
          Salida
        </Button>
      ) : null}
      {allowed.adjustment ? (
        <Button size="sm" variant="ghost" className="max-lg:h-11" onClick={() => onAction({ kind: 'adjustment', positionId: position.id })}>
          Ajustar
        </Button>
      ) : null}
    </>
  );
}

/** Por debajo de 1024 px (móvil y tableta): el reactivo con su total y, debajo, sus lotes como filas con sangría. */
function InventoryList({ products, byProduct, allowed, onAction }: InventoryViewProps) {
  return (
    <ul className="divide-y divide-line">
      {products.map((product) => {
        const rows = byProduct.get(product.id) ?? [];
        return (
          <li key={product.id} className="py-4">
            <div className="flex items-start justify-between gap-3 px-4">
              <h3 className="min-w-0">
                <ProductHeading product={product} />
              </h3>
              <Quantity value={product.balance} unit={product.baseUnit} className="text-lg font-semibold text-ink" />
            </div>
            {allowed.product || allowed.receipt ? (
              <div className="mt-2 flex gap-1 px-2">
                <ProductActions product={product} allowed={allowed} onAction={onAction} />
              </div>
            ) : null}
            {rows.length === 0 ? (
              <p className="mt-2 px-4 text-sm text-ink-subtle">Sin existencias registradas.</p>
            ) : (
              <ul className="ml-4 mt-3 divide-y divide-line border-l border-line">
                {rows.map((position) => (
                  <li key={position.id} className="py-3 pl-4 pr-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid min-w-0 gap-1 text-sm">
                        <span className="font-medium text-ink">{position.lot.code}</span>
                        <span className="text-ink">{position.location.name}</span>
                        <Expiry position={position} />
                      </div>
                      <Quantity
                        value={position.balance}
                        unit={position.unit}
                        className={`text-base font-semibold ${position.balance === '0' ? 'text-ink-subtle' : 'text-ink'}`}
                      />
                    </div>
                    {allowed.issue || allowed.adjustment ? (
                      <div className="-ml-3 mt-2 flex gap-1">
                        <PositionActions position={position} allowed={allowed} onAction={onAction} />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function InventoryGrid({ products, byProduct, allowed, onAction }: InventoryViewProps) {
  return (
    <Table>
      <TableHead>
        <tr>
          <TableHeader>Lote</TableHeader>
          <TableHeader>Ubicación</TableHeader>
          <TableHeader numeric>Saldo</TableHeader>
          <TableHeader className="w-0">
            <span className="sr-only">Acciones</span>
          </TableHeader>
        </tr>
      </TableHead>
      {products.map((product) => {
        const rows = byProduct.get(product.id) ?? [];
        return (
          <TableBody key={product.id} className="border-t border-line first-of-type:border-t-0">
            <tr className="bg-surface">
              <th scope="rowgroup" colSpan={2} className="px-4 pb-2 pt-4 text-left font-normal">
                <ProductHeading product={product} />
              </th>
              <td className="px-4 pb-2 pt-4 text-right">
                <span className="sr-only">Total del reactivo: </span>
                <Quantity value={product.balance} unit={product.baseUnit} className="text-lg font-semibold text-ink" />
              </td>
              <td className="px-4 pb-2 pt-4 text-right">
                <div className="flex justify-end gap-1">
                  <ProductActions product={product} allowed={allowed} onAction={onAction} />
                </div>
              </td>
            </tr>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 pb-4 text-sm text-ink-subtle">
                  Sin existencias registradas.
                </td>
              </tr>
            ) : (
              rows.map((position) => (
                <TableRow key={position.id}>
                  <TableCell className="pl-8">
                    <span className="block font-medium">{position.lot.code}</span>
                    <Expiry position={position} />
                  </TableCell>
                  <TableCell>
                    {position.location.name}
                    <span className="block text-[12px] text-ink-muted">{position.location.code}</span>
                  </TableCell>
                  <TableCell numeric>
                    <Quantity
                      value={position.balance}
                      unit={position.unit}
                      className={`text-base font-semibold ${position.balance === '0' ? 'text-ink-subtle' : 'text-ink'}`}
                    />
                  </TableCell>
                  <TableCell className="w-0 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-1">
                      <PositionActions position={position} allowed={allowed} onAction={onAction} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        );
      })}
    </Table>
  );
}

/** El tipo no es un estado: se distingue por icono y texto, no por colores de alerta. */
const typeLabel: Record<Operation['type'], { label: string; icon: typeof Scale }> = {
  receipt: { label: 'Ingreso', icon: ArrowDownToLine },
  issue: { label: 'Salida', icon: ArrowUpFromLine },
  adjustment: { label: 'Ajuste', icon: Scale },
};

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, Operation>();

/** Historial: tabla en escritorio y filas de actividad por debajo de 1024 px, sin desplazamiento lateral. */
function MovementsView({ operations, timeZone, filtered = false }: { operations: Operation[]; timeZone: string; filtered?: boolean }) {
  if (operations.length === 0) {
    return filtered ? (
      <StatePanel icon={History} title="Ningún movimiento con este filtro" description="Quita el filtro para ver todo el historial." />
    ) : (
      <StatePanel
        icon={History}
        title="Todavía no hay movimientos"
        description="Cada ingreso, salida o ajuste quedará aquí con su responsable y no se podrá editar."
      />
    );
  }
  return (
    <>
      <div className="hidden lg:block">
        <MovementsTable operations={operations} timeZone={timeZone} />
      </div>
      <ul className="divide-y divide-line lg:hidden">
        {operations.map((operation) => (
          <li key={operation.id} className="px-4 py-3.5">
            <ActivityRow
              type={operation.type}
              title={operation.product.name}
              detail={`${operation.lot.code} · ${operation.location.code}`}
              quantity={operation.quantity}
              unit={operation.unit}
              occurredAt={operation.effectiveAt}
              actor={operation.actor.displayName}
              timeZone={timeZone}
            />
            {operation.reason || operation.destination ? (
              <p className="mt-1.5 pl-[3.375rem] text-[13px] text-ink-muted">
                {[operation.reason, operation.destination ? `→ ${operation.destination}` : null].filter(Boolean).join(' ')}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}

/** Historial como libro: cada fila, una operación con su responsable; nada se edita. */
function MovementsTable({ operations, timeZone }: { operations: Operation[]; timeZone: string }) {
  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor('effectiveAt', {
          header: 'Fecha',
          cell: (info) => <span className="whitespace-nowrap text-ink-muted">{formatDateTime(info.getValue(), timeZone)}</span>,
        }),
        helper.accessor('type', {
          header: 'Movimiento',
          cell: (info) => {
            const type = typeLabel[info.getValue()];
            const Icon = type.icon;
            return (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-ink">
                <Icon className="size-3.5 text-ink-muted" aria-hidden />
                {type.label}
              </span>
            );
          },
        }),
        helper.display({
          id: 'reagent',
          header: 'Reactivo',
          cell: ({ row }) => (
            <>
              <span className="block whitespace-nowrap font-medium">{row.original.product.name}</span>
              <span className="block text-[12px] text-ink-muted">
                {row.original.lot.code} · {row.original.location.code}
              </span>
            </>
          ),
        }),
        helper.accessor('quantity', {
          header: 'Cantidad',
          cell: ({ row }) => <Quantity value={row.original.quantity} unit={row.original.unit} signed className="font-semibold" />,
        }),
        helper.accessor('balanceAfter', {
          header: 'Saldo',
          cell: ({ row }) => <Quantity value={row.original.balanceAfter} unit={row.original.unit} className="text-ink-muted" />,
        }),
        helper.display({
          id: 'actor',
          header: 'Responsable',
          cell: ({ row }) => (
            <span className="whitespace-nowrap">{row.original.actor.displayName ?? 'Miembro anterior'}</span>
          ),
        }),
        helper.display({
          id: 'detail',
          header: 'Detalle',
          cell: ({ row }) => {
            const { reason, destination, reference } = row.original;
            const text = [reason, destination ? `→ ${destination}` : null, reference].filter(Boolean).join(' ');
            return <span className="text-ink-muted">{text || '—'}</span>;
          },
        }),
      ]),
    [timeZone],
  );
  const table = useTable({ features, columns, data: operations, getRowId: (row) => row.id });
  const numeric = new Set(['quantity', 'balanceAfter']);

  return (
    <Table>
      <TableHead>
        {table.getHeaderGroups().map((group) => (
          <tr key={group.id}>
            {group.headers.map((header) => (
              <TableHeader key={header.id} numeric={numeric.has(header.column.id)}>
                {header.isPlaceholder ? null : <table.FlexRender header={header} />}
              </TableHeader>
            ))}
          </tr>
        ))}
      </TableHead>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getAllCells().map((cell) => (
              <TableCell key={cell.id} numeric={numeric.has(cell.column.id)}>
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
